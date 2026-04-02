import { create } from 'zustand'
import type { ChatMessage, KnowledgeBase } from '@/types'

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

  // UI state
  isTyping: boolean
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
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const defaultQuickSkills: QuickSkill[] = [
  { id: '1', name: '文档摘要', icon: 'FileText', description: '快速生成文档摘要' },
  { id: '2', name: '政策解读', icon: 'BookOpen', description: '解读政策文件要点' },
  { id: '3', name: '对比分析', icon: 'GitCompare', description: '对比多个文档内容' },
  { id: '4', name: '知识提取', icon: 'Lightbulb', description: '提取关键知识点' },
]

const mockKnowledgeBases: KnowledgeBase[] = [
  { id: '1', name: '公共政策库', type: 'public', description: '公共政策文档', documentCount: 256, createdAt: '2024-01-01', updatedAt: '2024-03-15' },
  { id: '2', name: '国家标准规范', type: 'public', description: '国家标准文档', documentCount: 128, createdAt: '2024-01-01', updatedAt: '2024-03-10' },
  { id: '3', name: '个人笔记', type: 'personal', description: '个人知识库', documentCount: 45, createdAt: '2024-02-01', updatedAt: '2024-03-20' },
  { id: '4', name: '部门文档', type: 'department', description: '部门共享文档', documentCount: 89, createdAt: '2024-01-15', updatedAt: '2024-03-18' },
]

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  currentSession: null,
  messages: [],
  mode: 'qa',
  knowledgeBases: mockKnowledgeBases,
  selectedKBs: ['1', '2'],
  isTyping: false,
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
}))