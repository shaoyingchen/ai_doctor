import { create } from 'zustand'
import type { ParseTask, ParseStage } from '@/types'
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
  completed: number
  failed: number
}

interface RagStateItem {
  docId: string
  filename?: string
  updatedAt?: string
  status?: 'pending' | 'parsing' | 'completed' | 'failed'
  progress?: number
  currentStage?: string
  error?: string | null
}

interface PipelineState {
  tasks: ParseTask[]
  statusCounts: StatusCounts
  currentProcessingDocument: string | null
  resourceUsage: ResourceUsage
  statusFilter: 'all' | 'pending' | 'processing' | 'completed' | 'failed'
  parseEngine: 'mineru' | 'pymupdf' | 'paddle-ocr'
  chunkStrategy: 'smart' | 'fixed' | 'paragraph'
  vectorModel: 'bge-large' | 'text-embedding' | 'custom'
  fetchTasks: () => Promise<void>
  setTasks: (tasks: ParseTask[]) => void
  updateTask: (id: string, updates: Partial<ParseTask>) => void
  removeTask: (id: string) => void
  retryTask: (id: string) => Promise<void>
  cancelTask: (id: string) => void
  setStatusFilter: (filter: 'all' | 'pending' | 'processing' | 'completed' | 'failed') => void
  setParseEngine: (engine: 'mineru' | 'pymupdf' | 'paddle-ocr') => void
  setChunkStrategy: (strategy: 'smart' | 'fixed' | 'paragraph') => void
  setVectorModel: (model: 'bge-large' | 'text-embedding' | 'custom') => void
  getFilteredTasks: () => ParseTask[]
  calculateProgress: (task: ParseTask) => ParseStage[]
}

const INITIAL_STATUS_COUNTS: StatusCounts = {
  pending: 0,
  processing: 0,
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
    documentName: item.filename || 'unknown',
    status,
    progress: item.progress ?? 0,
    currentStage: item.currentStage || 'Pending',
    error: item.error || undefined,
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
