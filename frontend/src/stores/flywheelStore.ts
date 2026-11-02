import { create } from 'zustand'

// Feedback types
export type FeedbackType = 'positive' | 'negative' | 'correction'
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'rejected'

export interface FeedbackItem {
  id: string
  type: FeedbackType
  content: string
  source: string
  timestamp: Date
  status: FeedbackStatus
  resolvedAt?: Date
  resolution?: string
}

// MetaPrompt types
export interface MetaPromptVersion {
  id: string
  version: string
  content: string
  createdAt: Date
  author: string
  changeLog: string
  isActive: boolean
}

// Quality metrics
export interface QualityMetrics {
  accuracy: number
  coverage: number
  satisfaction: number
  timeliness: number
  trend: 'up' | 'down' | 'stable'
}

// Knowledge gap
export interface KnowledgeGap {
  id: string
  topic: string
  priority: 'urgent' | 'medium' | 'low'
  occurrenceCount: number
  lastOccurrence: Date
  suggestedAction: string
}

// Flywheel stage
export type FlywheelStage = 'feedback' | 'evaluation' | 'completion' | 'optimization'

interface FlywheelState {
  // Current flywheel stage
  currentStage: FlywheelStage
  setCurrentStage: (stage: FlywheelStage) => void

  // Feedback items
  feedbackItems: FeedbackItem[]
  feedbackCounts: {
    positive: number
    negative: number
    correction: number
    pending: number
  }
  addFeedback: (feedback: Omit<FeedbackItem, 'id' | 'timestamp' | 'status'>) => void
  updateFeedbackStatus: (id: string, status: FeedbackStatus, resolution?: string) => void

  // MetaPrompt versions
  metaPrompts: MetaPromptVersion[]
  activeMetaPrompt: MetaPromptVersion | null
  addMetaPrompt: (prompt: Omit<MetaPromptVersion, 'id' | 'createdAt'>) => void
  setActiveMetaPrompt: (id: string) => void

  // Quality metrics
  qualityMetrics: QualityMetrics
  updateQualityMetrics: (metrics: Partial<QualityMetrics>) => void

  // Knowledge gaps
  knowledgeGaps: KnowledgeGap[]
  addKnowledgeGap: (gap: Omit<KnowledgeGap, 'id'>) => void
  removeKnowledgeGap: (id: string) => void

  // Flywheel running state
  isRunning: boolean
  cycleCount: number
  lastCycleTime: Date | null
  toggleFlywheel: () => void
  runCycle: () => void
}

// Sample data
const sampleFeedbackItems: FeedbackItem[] = [
  {
    id: '1',
    type: 'positive',
    content: '回答准确，解决了我的问题',
    source: 'AI对话-医疗咨询',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: 'resolved',
    resolvedAt: new Date(Date.now() - 1000 * 60 * 20),
    resolution: '已记录优秀回答模式'
  },
  {
    id: '2',
    type: 'negative',
    content: '回答不够准确，缺少关键信息',
    source: 'AI对话-政策查询',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    status: 'processing'
  },
  {
    id: '3',
    type: 'correction',
    content: '关于医保报销比例的信息有误，最新政策已调整',
    source: 'AI对话-医保咨询',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    status: 'pending'
  },
  {
    id: '4',
    type: 'positive',
    content: '提供了详细的操作步骤，非常实用',
    source: 'AI对话-办事指南',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    status: 'resolved'
  },
  {
    id: '5',
    type: 'negative',
    content: '回答过于简略，需要更详细的解释',
    source: 'AI对话-技术咨询',
    timestamp: new Date(Date.now() - 1000 * 60 * 150),
    status: 'pending'
  }
]

const sampleMetaPrompts: MetaPromptVersion[] = [
  {
    id: '1',
    version: 'v2.3.0',
    content: '你是一个专业的医疗健康助手，请根据用户问题提供准确、专业的回答...',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    author: '系统管理员',
    changeLog: '优化了医疗问答的准确性',
    isActive: true
  },
  {
    id: '2',
    version: 'v2.2.0',
    content: '你是一个专业的医疗健康助手，请根据用户问题提供准确、专业的回答...',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    author: '系统管理员',
    changeLog: '增加了政策解读能力',
    isActive: false
  }
]

const sampleKnowledgeGaps: KnowledgeGap[] = [
  {
    id: '1',
    topic: '最新医保政策解读',
    priority: 'urgent',
    occurrenceCount: 15,
    lastOccurrence: new Date(Date.now() - 1000 * 60 * 60),
    suggestedAction: '添加2024年医保政策文档'
  },
  {
    id: '2',
    topic: '慢性病管理指南',
    priority: 'medium',
    occurrenceCount: 8,
    lastOccurrence: new Date(Date.now() - 1000 * 60 * 60 * 3),
    suggestedAction: '补充慢性病管理知识库'
  },
  {
    id: '3',
    topic: '疫苗接种注意事项',
    priority: 'low',
    occurrenceCount: 3,
    lastOccurrence: new Date(Date.now() - 1000 * 60 * 60 * 24),
    suggestedAction: '添加疫苗接种相关知识'
  }
]

export const useFlywheelStore = create<FlywheelState>((set) => ({
  // Current stage
  currentStage: 'feedback',
  setCurrentStage: (stage) => set({ currentStage: stage }),

  // Feedback items
  feedbackItems: sampleFeedbackItems,
  feedbackCounts: {
    positive: sampleFeedbackItems.filter(f => f.type === 'positive').length,
    negative: sampleFeedbackItems.filter(f => f.type === 'negative').length,
    correction: sampleFeedbackItems.filter(f => f.type === 'correction').length,
    pending: sampleFeedbackItems.filter(f => f.status === 'pending').length
  },

  addFeedback: (feedback) => {
    const newFeedback: FeedbackItem = {
      ...feedback,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'pending'
    }
    set(state => ({
      feedbackItems: [newFeedback, ...state.feedbackItems],
      feedbackCounts: {
        ...state.feedbackCounts,
        [feedback.type]: state.feedbackCounts[feedback.type] + 1,
        pending: state.feedbackCounts.pending + 1
      }
    }))
  },

  updateFeedbackStatus: (id, status, resolution) => {
    set(state => {
      const items = state.feedbackItems.map(item =>
        item.id === id
          ? { ...item, status, resolution, resolvedAt: status === 'resolved' ? new Date() : item.resolvedAt }
          : item
      )
      const pendingDiff = status === 'resolved' || status === 'rejected' ? -1 : 0
      return {
        feedbackItems: items,
        feedbackCounts: {
          ...state.feedbackCounts,
          pending: state.feedbackCounts.pending + pendingDiff
        }
      }
    })
  },

  // MetaPrompts
  metaPrompts: sampleMetaPrompts,
  activeMetaPrompt: sampleMetaPrompts.find(p => p.isActive) || null,

  addMetaPrompt: (prompt) => {
    const newPrompt: MetaPromptVersion = {
      ...prompt,
      id: Date.now().toString(),
      createdAt: new Date()
    }
    set(state => ({
      metaPrompts: [newPrompt, ...state.metaPrompts],
      activeMetaPrompt: prompt.isActive ? newPrompt : state.activeMetaPrompt
    }))
  },

  setActiveMetaPrompt: (id) => {
    set(state => {
      const prompts = state.metaPrompts.map(p => ({
        ...p,
        isActive: p.id === id
      }))
      return {
        metaPrompts: prompts,
        activeMetaPrompt: prompts.find(p => p.id === id) || null
      }
    })
  },

  // Quality metrics
  qualityMetrics: {
    accuracy: 94.5,
    coverage: 87.2,
    satisfaction: 92.1,
    timeliness: 96.8,
    trend: 'up'
  },

  updateQualityMetrics: (metrics) => {
    set(state => ({
      qualityMetrics: { ...state.qualityMetrics, ...metrics }
    }))
  },

  // Knowledge gaps
  knowledgeGaps: sampleKnowledgeGaps,

  addKnowledgeGap: (gap) => {
    const newGap: KnowledgeGap = {
      ...gap,
      id: Date.now().toString()
    }
    set(state => ({
      knowledgeGaps: [newGap, ...state.knowledgeGaps]
    }))
  },

  removeKnowledgeGap: (id) => {
    set(state => ({
      knowledgeGaps: state.knowledgeGaps.filter(g => g.id !== id)
    }))
  },

  // Flywheel running state
  isRunning: true,
  cycleCount: 127,
  lastCycleTime: new Date(Date.now() - 1000 * 60 * 15),

  toggleFlywheel: () => {
    set(state => ({ isRunning: !state.isRunning }))
  },

  runCycle: () => {
    set(state => ({
      cycleCount: state.cycleCount + 1,
      lastCycleTime: new Date()
    }))
  }
}))