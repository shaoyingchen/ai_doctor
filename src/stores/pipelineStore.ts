import { create } from 'zustand'
import type { ParseTask, ParseStage, ReviewDetail } from '@/types'
import { API_BASE_WITH_PATH } from '@/config/api'

export interface PipelineStage {
  id: string
  name: string
  nameEn: string
  description: string
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'upload', name: '上传', nameEn: 'Upload', description: '文件上传' },
  { id: 'parse', name: '解析', nameEn: 'Parse', description: '文档解析' },
  { id: 'chunk', name: '分块', nameEn: 'Chunk', description: '内容切分' },
  { id: 'vectorize', name: '向量化', nameEn: 'Vectorize', description: '向量构建' },
  { id: 'store', name: '入库', nameEn: 'Store', description: '写入存储' },
]

export interface ResourceUsage {
  cpu: number
  memory: number
  queueLength: number
}

export interface StatusCounts {
  pending: number
  processing: number
  waitingReview: number
  completed: number
  failed: number
}

interface RagStateItem {
  docId: string
  filename?: string
  updatedAt?: string
  status?: 'pending' | 'parsing' | 'waiting_review' | 'completed' | 'failed'
  progress?: number
  currentStage?: string
  error?: string | null
  reviewReason?: string | null
}

interface PipelineState {
  tasks: ParseTask[]
  statusCounts: StatusCounts
  currentProcessingDocument: string | null
  resourceUsage: ResourceUsage
  statusFilter: 'all' | 'pending' | 'processing' | 'waiting_review' | 'completed' | 'failed'
  parseEngine: 'mineru' | 'pymupdf' | 'paddle-ocr'
  chunkStrategy: 'smart' | 'fixed' | 'paragraph'
  vectorModel: 'bge-large' | 'text-embedding' | 'custom'
  fetchTasks: () => Promise<void>
  fetchReviewDetail: (docId: string) => Promise<ReviewDetail>
  submitReview: (docId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>
  setTasks: (tasks: ParseTask[]) => void
  updateTask: (id: string, updates: Partial<ParseTask>) => void
  removeTask: (id: string) => void
  retryTask: (id: string) => Promise<void>
  cancelTask: (id: string) => void
  setStatusFilter: (filter: 'all' | 'pending' | 'processing' | 'waiting_review' | 'completed' | 'failed') => void
  setParseEngine: (engine: 'mineru' | 'pymupdf' | 'paddle-ocr') => void
  setChunkStrategy: (strategy: 'smart' | 'fixed' | 'paragraph') => void
  setVectorModel: (model: 'bge-large' | 'text-embedding' | 'custom') => void
  getFilteredTasks: () => ParseTask[]
  calculateProgress: (task: ParseTask) => ParseStage[]
}

const INITIAL_STATUS_COUNTS: StatusCounts = {
  pending: 0,
  processing: 0,
  waitingReview: 0,
  completed: 0,
  failed: 0,
}

const INITIAL_RESOURCE_USAGE: ResourceUsage = {
  cpu: 0,
  memory: 0,
  queueLength: 0,
}

function mapRagItemToTask(item: RagStateItem): ParseTask {
  const now = item.updatedAt || new Date().toISOString()
  const status = item.status || 'pending'
  return {
    id: item.docId,
    documentId: item.docId,
    documentName: item.filename || '未知',
    status,
    progress: item.progress ?? 0,
    currentStage: item.currentStage || '待处理',
    error: item.error || undefined,
    reviewReason: item.reviewReason ?? null,
    createdAt: now,
    startedAt: status === 'parsing' ? now : undefined,
    completedAt: status === 'completed' ? now : undefined,
  }
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  tasks: [],
  statusCounts: INITIAL_STATUS_COUNTS,
  currentProcessingDocument: null,
  resourceUsage: INITIAL_RESOURCE_USAGE,
  statusFilter: 'all',
  parseEngine: 'mineru',
  chunkStrategy: 'smart',
  vectorModel: 'bge-large',

  fetchTasks: async () => {
    try {
      const response = await fetch(API_BASE_WITH_PATH('/api/rag/state'))
      if (!response.ok) throw new Error('Failed to fetch RAG state')

      const data = (await response.json()) as { items?: RagStateItem[] }
      const items = Array.isArray(data.items) ? data.items : []
      const fetchedTasks = items.map(mapRagItemToTask)

      const statusCounts: StatusCounts = {
        pending: fetchedTasks.filter((t) => t.status === 'pending').length,
        processing: fetchedTasks.filter((t) => t.status === 'parsing').length,
        waitingReview: fetchedTasks.filter((t) => t.status === 'waiting_review').length,
        completed: fetchedTasks.filter((t) => t.status === 'completed').length,
        failed: fetchedTasks.filter((t) => t.status === 'failed').length,
      }

      const processingTask = fetchedTasks.find((t) => t.status === 'parsing')
      const processing = statusCounts.processing
      const resourceUsage: ResourceUsage = {
        cpu: Math.min(100, 20 + processing * 12),
        memory: Math.min(100, 25 + processing * 10),
        queueLength: statusCounts.pending,
      }

      set({
        tasks: fetchedTasks,
        statusCounts,
        currentProcessingDocument: processingTask?.documentName || null,
        resourceUsage,
      })
    } catch (error) {
      console.error('[PipelineStore] fetchTasks failed:', error)
    }
  },

  // GET /api/rag/review/{docId}：无待审核内容时后端返回 404
  fetchReviewDetail: async (docId) => {
    const response = await fetch(API_BASE_WITH_PATH(`/api/rag/review/${docId}`))
    if (response.status === 404) {
      throw new Error('该文档当前无待审核内容（可能已被处理）')
    }
    if (!response.ok) {
      throw new Error(`获取审核详情失败（HTTP ${response.status}）`)
    }
    return (await response.json()) as ReviewDetail
  },

  // POST /api/rag/review/{docId}：approve 后任务从 parsing 继续，reject 后标记 failed
  submitReview: async (docId, action, notes) => {
    const response = await fetch(API_BASE_WITH_PATH(`/api/rag/review/${docId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notes ? { action, notes } : { action }),
    })
    if (!response.ok) {
      let message = `提交审核结果失败（HTTP ${response.status}）`
      try {
        const data = (await response.json()) as { message?: unknown }
        if (typeof data.message === 'string' && data.message) {
          message = data.message
        }
      } catch {
        // 读取错误体失败时保留默认提示
      }
      throw new Error(message)
    }
    await get().fetchTasks()
  },

  setTasks: (tasks) => set({ tasks }),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),

  retryTask: async (id) => {
    const state = get()
    const targetTask = state.tasks.find((task) => task.id === id)
    const docId = targetTask?.documentId || id
    try {
      const response = await fetch(API_BASE_WITH_PATH(`/api/rag/retry/${docId}`), {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to retry RAG task')
      await get().fetchTasks()
    } catch (error) {
      console.error('[PipelineStore] retryTask failed:', error)
    }
  },

  cancelTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  setParseEngine: (engine) => set({ parseEngine: engine }),

  setChunkStrategy: (strategy) => set({ chunkStrategy: strategy }),

  setVectorModel: (model) => set({ vectorModel: model }),

  getFilteredTasks: () => {
    const state = get()
    if (state.statusFilter === 'all') return state.tasks
    return state.tasks.filter((task) => {
      if (state.statusFilter === 'processing') return task.status === 'parsing'
      return task.status === state.statusFilter
    })
  },

  calculateProgress: (task) => {
    return PIPELINE_STAGES.map((stage, index) => {
      const stageProgress = (index + 1) * 20
      let status: ParseStage['status'] = 'pending'
      let progress = 0

      if (task.progress > stageProgress) {
        status = 'completed'
        progress = 100
      } else if (task.progress > index * 20) {
        status = 'processing'
        progress = ((task.progress - index * 20) / 20) * 100
      }

      if (task.status === 'failed' && task.progress <= stageProgress && task.progress > index * 20) {
        status = 'failed'
      }

      return {
        name: stage.name,
        status,
        progress: Math.round(progress),
      }
    })
  },
}))
