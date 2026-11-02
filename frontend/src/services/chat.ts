import { API_BASE_URL } from '@/config/api'
import type { KnowledgeBase } from '@/types'

// ============================================================
// POST /api/chat 契约类型（与后端约定严格对齐，勿随意改动）
// ============================================================

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestPayload {
  message: string
  history: ChatHistoryItem[]
  mode: 'qa' | 'create' | 'analyze'
  kbIds: string[]
  stream: boolean
}

/** 检索来源（SSE sources 事件与非流式响应共用） */
export interface ChatSource {
  docId: string
  filename: string
  chunkIndex: number
  /** 相似度得分，0~1 */
  score: number
  excerpt: string
}

// SSE 事件：{"type":"status"}? → {"type":"sources"} → {"type":"token"} × N → {"type":"done"} | {"type":"error"}
// status 为可选的检索阶段提示事件（sources 之前下发，如 "正在优化检索…"）
export interface SourcesEvent {
  type: 'sources'
  sources: ChatSource[]
}
export interface TokenEvent {
  type: 'token'
  content: string
}
export interface StatusEvent {
  type: 'status'
  message: string
}
export interface DoneEvent {
  type: 'done'
}
export interface ErrorEvent {
  type: 'error'
  message: string
}
export type ChatStreamEvent = SourcesEvent | TokenEvent | StatusEvent | DoneEvent | ErrorEvent

export interface ChatStreamCallbacks {
  onSources?: (sources: ChatSource[]) => void
  onToken?: (content: string) => void
  onStatus?: (message: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

export interface ChatResponse {
  answer: string
  sources: ChatSource[]
}

/**
 * 流式对话：POST /api/chat（stream=true），text/event-stream。
 *
 * SSE 解析容错方案：
 * 1. 按 chunk 解码（TextDecoder stream 模式，避免多字节字符被截断）后追加到缓冲区；
 * 2. 缓冲区按 \n 切分，最后一段可能是不完整行，留在缓冲区与下一 chunk 拼接；
 * 3. 仅处理 "data:" 前缀行，空行（事件分隔符 \n\n）与其余行一律忽略；
 * 4. 单行 JSON.parse 失败仅告警跳过，不中断整个流；
 * 5. 流结束时冲刷残余缓冲区再解析一次；
 * 6. 若流正常关闭但未收到 done/error 终端事件，兜底触发 onDone，避免 UI 卡在加载态。
 */
export async function sendChatStream(
  payload: ChatRequestPayload,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...payload, stream: true }),
    })
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : '网络请求失败')
    return
  }

  if (!response.ok) {
    let message = `请求失败（HTTP ${response.status}）`
    try {
      const text = await response.text()
      if (text) {
        try {
          const data = JSON.parse(text) as { message?: unknown }
          if (typeof data.message === 'string' && data.message) {
            message = data.message
          }
        } catch {
          message = text.slice(0, 200)
        }
      }
    } catch {
      // 读取错误体失败时保留默认提示
    }
    callbacks.onError?.(message)
    return
  }

  if (!response.body) {
    callbacks.onError?.('响应体为空，无法建立流式连接')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  // 是否已收到终端事件（done / error），用于结束兜底判断
  let terminated = false

  const dispatchEvent = (rawLine: string): void => {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) return
    const data = line.slice('data:'.length).trim()
    if (!data) return

    let event: ChatStreamEvent
    try {
      event = JSON.parse(data) as ChatStreamEvent
    } catch {
      console.warn('[chat] 跳过无法解析的 SSE 数据行:', data)
      return
    }

    switch (event.type) {
      case 'sources':
        callbacks.onSources?.(Array.isArray(event.sources) ? event.sources : [])
        break
      case 'token':
        if (typeof event.content === 'string') {
          callbacks.onToken?.(event.content)
        }
        break
      case 'status':
        if (typeof event.message === 'string' && event.message) {
          callbacks.onStatus?.(event.message)
        }
        break
      case 'done':
        terminated = true
        callbacks.onDone?.()
        break
      case 'error':
        terminated = true
        callbacks.onError?.(event.message || '后端返回未知错误')
        break
      default:
        break
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // 最后一段可能不完整，留待下一 chunk 拼接
      buffer = lines.pop() ?? ''
      for (const line of lines) dispatchEvent(line)
    }
    // 流结束：冲刷解码器与缓冲区残余
    buffer += decoder.decode()
    for (const line of buffer.split('\n')) dispatchEvent(line)
    buffer = ''
  } catch (error) {
    terminated = true
    callbacks.onError?.(error instanceof Error ? error.message : '流式读取中断')
  }

  if (!terminated) {
    console.warn('[chat] SSE 流结束但未收到 done/error 事件，按完成处理')
    callbacks.onDone?.()
  }
}

/**
 * 非流式对话备用：POST /api/chat（stream=false），返回完整 JSON。
 */
export async function sendChat(payload: ChatRequestPayload): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, stream: false }),
  })

  if (!response.ok) {
    throw new Error(`请求失败（HTTP ${response.status}）：${response.statusText}`)
  }

  return response.json() as Promise<ChatResponse>
}

// ============================================================
// GET /api/kb/tree
// ============================================================

interface KBTreeNode {
  id: string
  name: string
  type: 'kb' | 'folder'
  parentId?: string | null
  knowledgeBaseType?: KnowledgeBase['type']
  documentCount?: number
  children?: KBTreeNode[]
}

/** 递归拍平树，取 type === 'kb' 的节点（兼容嵌套 children 与平铺 parentId 两种结构） */
function flattenKBTree(nodes: KBTreeNode[]): KBTreeNode[] {
  const result: KBTreeNode[] = []
  for (const node of nodes) {
    if (node.type === 'kb') {
      result.push(node)
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      result.push(...flattenKBTree(node.children))
    }
  }
  return result
}

export async function fetchKnowledgeBases(): Promise<KnowledgeBase[]> {
  const response = await fetch(`${API_BASE_URL}/api/kb/tree`)

  if (!response.ok) {
    throw new Error(`获取知识库列表失败（HTTP ${response.status}）`)
  }

  const data = (await response.json()) as {
    nodes?: KBTreeNode[]
    knowledgeBases?: KBTreeNode[]
  }
  // 契约为 { nodes: [...] }；knowledgeBases 为既有页面消费过的兼容字段
  const nodes = Array.isArray(data?.nodes)
    ? data.nodes
    : Array.isArray(data?.knowledgeBases)
      ? data.knowledgeBases
      : []

  return flattenKBTree(nodes).map((node) => ({
    id: node.id,
    name: node.name,
    type: node.knowledgeBaseType ?? 'public',
    description: '',
    documentCount: node.documentCount ?? 0,
    createdAt: '',
    updatedAt: '',
  }))
}
