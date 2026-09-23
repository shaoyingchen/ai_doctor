import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, KnowledgeBase, SourceReference } from '@/types'
import {
  fetchKnowledgeBases,
  sendChatStream,
  type ChatSource,
} from '@/services/chat'

export type ChatMode = 'qa' | 'create' | 'analyze'

interface QuickSkill {
  id: string
  name: string
  icon: string
  description: string
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  mode: ChatMode
  selectedKBs: string[]
  createdAt: string
  updatedAt: string
}

interface ChatState {
  // Current session
  currentSession: ChatSession | null
  messages: ChatMessage[]
  mode: ChatMode

  // Knowledge base selection
  knowledgeBases: KnowledgeBase[]
  selectedKBs: string[]
  kbLoading: boolean
  kbError: string | null

  // UI state
  isTyping: boolean
  /** 打字态提示文本：默认"正在思考…"，收到 SSE status 事件时替换为后端提示 */
  typingText: string
  sidePanelOpen: boolean

  // History
  chatHistory: ChatSession[]

  // Quick skills
  quickSkills: QuickSkill[]

  // Actions
  setMode: (mode: ChatMode) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  toggleKB: (kbId: string) => void
  setTyping: (typing: boolean) => void
  toggleSidePanel: () => void
  newChat: () => void
  loadSession: (sessionId: string) => void
  loadKnowledgeBases: () => Promise<void>
  sendMessage: (content: string) => Promise<void>
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const DEFAULT_TYPING_TEXT = '正在思考…'

const defaultQuickSkills: QuickSkill[] = [
  { id: '1', name: '文档摘要', icon: 'FileText', description: '快速生成文档摘要' },
  { id: '2', name: '政策解读', icon: 'BookOpen', description: '解读政策文件要点' },
  { id: '3', name: '对比分析', icon: 'GitCompare', description: '对比多个文档内容' },
  { id: '4', name: '知识提取', icon: 'Lightbulb', description: '提取关键知识点' },
]

/** 后端检索来源 → 前端 SourceReference（标题/摘要/相似度/分块序号） */
const mapSources = (sources: ChatSource[]): SourceReference[] =>
  sources.map((s) => ({
    knowledgeBase: '',
    document: s.filename,
    location: `Chunk ${s.chunkIndex}`,
    confidence: s.score,
    docId: s.docId,
    excerpt: s.excerpt,
    chunkIndex: s.chunkIndex,
  }))

/** 持久化前剥离加载态，避免中途关闭页面后残留“加载中”消息 */
const stripLoading = (message: ChatMessage): ChatMessage => ({
  ...message,
  isLoading: false,
})

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      messages: [],
      mode: 'qa',
      knowledgeBases: [],
      selectedKBs: [],
      kbLoading: false,
      kbError: null,
      isTyping: false,
      typingText: DEFAULT_TYPING_TEXT,
      sidePanelOpen: true,
      chatHistory: [],
      quickSkills: defaultQuickSkills,

      // Actions
      setMode: (mode) => set({ mode }),

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date().toISOString(),
        }
        set((state) => ({
          messages: [...state.messages, newMessage],
        }))
      },

      clearMessages: () => set({ messages: [] }),

      toggleKB: (kbId) => {
        set((state) => ({
          selectedKBs: state.selectedKBs.includes(kbId)
            ? state.selectedKBs.filter(id => id !== kbId)
            : [...state.selectedKBs, kbId],
        }))
      },

      setTyping: (typing) => set({ isTyping: typing }),

      toggleSidePanel: () => set((state) => ({ sidePanelOpen: !state.sidePanelOpen })),

      newChat: () => {
        const state = get()
        // Save current session to history if it has messages
        if (state.messages.length > 0) {
          const session: ChatSession = {
            id: generateId(),
            title: state.messages[0].content.slice(0, 30) + '...',
            messages: state.messages,
            mode: state.mode,
            selectedKBs: state.selectedKBs,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          set({
            currentSession: null,
            messages: [],
            chatHistory: [session, ...state.chatHistory],
          })
        } else {
          set({ currentSession: null, messages: [] })
        }
      },

      loadSession: (sessionId) => {
        const state = get()
        const session = state.chatHistory.find(s => s.id === sessionId)
        if (session) {
          set({
            currentSession: session,
            messages: session.messages,
            mode: session.mode,
            selectedKBs: session.selectedKBs,
          })
        }
      },

      loadKnowledgeBases: async () => {
        set({ kbLoading: true, kbError: null })
        try {
          const knowledgeBases = await fetchKnowledgeBases()
          set((state) => {
            const validIds = new Set(knowledgeBases.map(kb => kb.id))
            const kept = state.selectedKBs.filter(id => validIds.has(id))
            return {
              knowledgeBases,
              // 保留有效勾选；无有效勾选时默认全选（含清理历史遗留的失效 id）
              selectedKBs: kept.length > 0 ? kept : knowledgeBases.map(kb => kb.id),
              kbLoading: false,
            }
          })
        } catch (error) {
          set({
            kbLoading: false,
            kbError: error instanceof Error ? error.message : '知识库列表加载失败',
          })
        }
      },

      /**
       * 流式发送状态机：
       * 追加用户消息 → 追加空 assistant 占位（isLoading）
       * → onSources 填入引用来源 → onToken 增量追加 content（首个 token 关闭输入区打字态）
       * → onDone 结束 loading → onError 将错误提示写入 content 并结束 loading
       */
      sendMessage: async (content) => {
        const state = get()
        if (state.isTyping) return
        const message = content.trim()
        if (!message) return

        // 最近 10 条历史（不含本次新消息与加载中的占位消息）
        const history = state.messages
          .filter(m => !m.isLoading && m.content)
          .slice(-10)
          .map(m => ({ role: m.role, content: m.content }))

        const userMessage: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        }
        const assistantId = generateId()
        const assistantMessage: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isLoading: true,
        }

        set((s) => ({
          messages: [...s.messages, userMessage, assistantMessage],
          isTyping: true,
          typingText: DEFAULT_TYPING_TEXT,
        }))

        const patchAssistant = (patch: Partial<ChatMessage>) =>
          set((s) => ({
            messages: s.messages.map(m =>
              m.id === assistantId ? { ...m, ...patch } : m
            ),
          }))

        let firstTokenReceived = false

        await sendChatStream(
          {
            message,
            history,
            mode: state.mode,
            kbIds: state.selectedKBs,
            stream: true,
          },
          {
            onSources: (sources) => {
              const mapped = mapSources(sources)
              patchAssistant({
                sources: mapped,
                verified:
                  mapped.length > 0 && mapped.every(s => s.confidence >= 0.9),
              })
            },
            onStatus: (message) => {
              set({ typingText: message })
            },
            onToken: (token) => {
              if (!firstTokenReceived) {
                firstTokenReceived = true
                set({ isTyping: false })
              }
              set((s) => ({
                messages: s.messages.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + token }
                    : m
                ),
              }))
            },
            onDone: () => {
              patchAssistant({ isLoading: false })
              set({ isTyping: false })
            },
            onError: (errorMessage) => {
              set((s) => ({
                isTyping: false,
                messages: s.messages.map(m =>
                  m.id === assistantId
                    ? {
                        ...m,
                        isLoading: false,
                        content: m.content
                          ? `${m.content}\n\n[请求中断] ${errorMessage}`
                          : `抱歉，请求出错：${errorMessage}`,
                      }
                    : m
                ),
              }))
            },
          },
        )
      },
    }),
    {
      name: 'ai-doctor-chat',
      partialize: (state) => ({
        messages: state.messages.map(stripLoading),
        chatHistory: state.chatHistory.map(session => ({
          ...session,
          messages: session.messages.map(stripLoading),
        })),
        selectedKBs: state.selectedKBs,
      }),
    },
  ),
)
