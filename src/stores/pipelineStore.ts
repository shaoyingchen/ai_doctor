import { create } from 'zustand'
import type { ParseTask, ParseStage } from '@/types'

// Pipeline stage definition
export interface PipelineStage {
  id: string
  name: string
  nameEn: string
  description: string
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'upload', name: '上传', nameEn: 'Upload', description: '文件上传中' },
  { id: 'parse', name: '解析', nameEn: 'Parse', description: '文档解析中' },
  { id: 'chunk', name: '分块', nameEn: 'Chunk', description: '内容分块中' },
  { id: 'vectorize', name: '向量化', nameEn: 'Vectorize', description: '向量化处理中' },
  { id: 'store', name: '入库', nameEn: 'Store', description: '写入数据库中' },
]

// Resource monitoring
export interface ResourceUsage {
  cpu: number
  memory: number
  queueLength: number
}

// Status counts
export interface StatusCounts {
  pending: number
  processing: number
  completed: number
  failed: number
}

interface PipelineState {
  // Task list
  tasks: ParseTask[]
  statusCounts: StatusCounts

  // Current processing info
  currentProcessingDocument: string | null
  resourceUsage: ResourceUsage

  // Filters
  statusFilter: 'all' | 'pending' | 'processing' | 'completed' | 'failed'

  // Configuration
  parseEngine: 'mineru' | 'pymupdf' | 'paddle-ocr'
  chunkStrategy: 'smart' | 'fixed' | 'paragraph'
  vectorModel: 'bge-large' | 'text-embedding' | 'custom'

  // Actions
  setTasks: (tasks: ParseTask[]) => void
  updateTask: (id: string, updates: Partial<ParseTask>) => void
  removeTask: (id: string) => void
  retryTask: (id: string) => void
  cancelTask: (id: string) => void
  setStatusFilter: (filter: 'all' | 'pending' | 'processing' | 'completed' | 'failed') => void
  setParseEngine: (engine: 'mineru' | 'pymupdf' | 'paddle-ocr') => void
  setChunkStrategy: (strategy: 'smart' | 'fixed' | 'paragraph') => void
  setVectorModel: (model: 'bge-large' | 'text-embedding' | 'custom') => void

  // Computed
  getFilteredTasks: () => ParseTask[]
  calculateProgress: (task: ParseTask) => ParseStage[]
}

// Mock data for demo
const mockTasks: ParseTask[] = [
  {
    id: '1',
    documentId: 'doc1',
    documentName: '2024数字化转型指南.pdf',
    status: 'completed',
    progress: 100,
    currentStage: '入库',
    createdAt: '2026-04-02T10:00:00Z',
    startedAt: '2026-04-02T10:01:00Z',
    completedAt: '2026-04-02T10:15:00Z',
  },
  {
    id: '2',
    documentId: 'doc2',
    documentName: '公共政策研究报告.docx',
    status: 'vectorizing',
    progress: 75,
    currentStage: '向量化',
    createdAt: '2026-04-02T11:00:00Z',
    startedAt: '2026-04-02T11:01:00Z',
  },
  {
    id: '3',
    documentId: 'doc3',
    documentName: '技术规范v2.0.pdf',
    status: 'parsing',
    progress: 30,
    currentStage: '解析',
    createdAt: '2026-04-02T11:30:00Z',
    startedAt: '2026-04-02T11:31:00Z',
  },
  {
    id: '4',
    documentId: 'doc4',
    documentName: '会议纪要-20260402.txt',
    status: 'pending',
    progress: 0,
    currentStage: '等待处理',
    createdAt: '2026-04-02T12:00:00Z',
  },
  {
    id: '5',
    documentId: 'doc5',
    documentName: '错误文档测试.pdf',
    status: 'failed',
    progress: 15,
    currentStage: '解析失败',
    error: '文件格式不支持或文件已损坏',
    createdAt: '2026-04-02T09:00:00Z',
    startedAt: '2026-04-02T09:05:00Z',
  },
  {
    id: '6',
    documentId: 'doc6',
    documentName: '国家标准规范汇编.pdf',
    status: 'chunking',
    progress: 55,
    currentStage: '分块',
    createdAt: '2026-04-02T11:45:00Z',
    startedAt: '2026-04-02T11:46:00Z',
  },
]

const mockStatusCounts: StatusCounts = {
  pending: 12,
  processing: 5,
  completed: 128,
  failed: 3,
}

const mockResourceUsage: ResourceUsage = {
  cpu: 65,
  memory: 48,
  queueLength: 8,
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  tasks: mockTasks,
  statusCounts: mockStatusCounts,
  currentProcessingDocument: '技术规范v2.0.pdf',
  resourceUsage: mockResourceUsage,
  statusFilter: 'all',
  parseEngine: 'mineru',
  chunkStrategy: 'smart',
  vectorModel: 'bge-large',

  setTasks: (tasks) => set({ tasks }),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((task) =>
      task.id === id ? { ...task, ...updates } : task
    ),
  })),

  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== id),
  })),

  retryTask: (id) => set((state) => ({
    tasks: state.tasks.map((task) =>
      task.id === id
        ? { ...task, status: 'pending', progress: 0, currentStage: '等待处理', error: undefined }
        : task
    ),
  })),

  cancelTask: (id) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== id),
  })),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  setParseEngine: (engine) => set({ parseEngine: engine }),

  setChunkStrategy: (strategy) => set({ chunkStrategy: strategy }),

  setVectorModel: (model) => set({ vectorModel: model }),

  getFilteredTasks: () => {
    const state = get()
    if (state.statusFilter === 'all') {
      return state.tasks
    }
    return state.tasks.filter((task) => task.status === state.statusFilter)
  },

  calculateProgress: (task) => {
    const stages: ParseStage[] = PIPELINE_STAGES.map((stage, index) => {
      const stageProgress = (index + 1) * 20 // Each stage is 20%
      let status: ParseStage['status'] = 'pending'
      let progress = 0

      if (task.progress > stageProgress) {
        status = 'completed'
        progress = 100
      } else if (task.progress > index * 20) {
        status = 'processing'
        progress = ((task.progress - index * 20) / 20) * 100
      }

      return {
        name: stage.name,
        status,
        progress: Math.round(progress),
      }
    })

    return stages
  },
}))