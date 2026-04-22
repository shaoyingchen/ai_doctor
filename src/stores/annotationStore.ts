import { create } from 'zustand'
import type { AnnotationTask, AutoAnnotation, ManualAnnotation, NLPAnnotationResult, EntityAnnotation, KeywordAnnotation, CategoryAnnotation } from '@/types'
import { API_BASE_WITH_PATH } from '@/config/api'

export type AnnotationStatus = 'pending' | 'in_progress' | 'approved' | 'rejected'
export type AnnotationType = 'category' | 'entity' | 'keyword'
export type EntityType = 'region' | 'time' | 'number' | 'organization'

interface AnnotationStats {
  pending: number
  inProgress: number
  approved: number
  rejected: number
}

interface DocumentContent {
  id: string
  content: string
  highlights: HighlightRange[]
}

interface HighlightRange {
  start: number
  end: number
  type: AnnotationType
  color: string
  label: string
}

interface AnnotationState {
  // Task list
  tasks: AnnotationTask[]
  filteredTasks: AnnotationTask[]
  selectedTaskId: string | null
  statusFilter: AnnotationStatus | 'all'
  searchQuery: string

  // Statistics
  stats: AnnotationStats

  // Current document
  currentDocument: DocumentContent | null

  // Annotations for current task
  autoAnnotations: AutoAnnotation[]
  manualAnnotations: ManualAnnotation[]

  // UI State
  isAnnotating: boolean
  showAutoAnnotations: boolean
  activeAnnotationType: AnnotationType

  // Entity types for entity annotation
  entityTypes: { id: EntityType; label: string; color: string }[]

  // Actions
  setStatusFilter: (status: AnnotationStatus | 'all') => void
  setSearchQuery: (query: string) => void
  selectTask: (taskId: string | null) => void
  addManualAnnotation: (annotation: Omit<ManualAnnotation, 'verified'>) => void
  removeManualAnnotation: (index: number) => void
  verifyAnnotation: (index: number, verified: boolean) => void
  approveTask: (taskId: string) => void
  rejectTask: (taskId: string, reason?: string) => void
  batchApprove: (taskIds: string[]) => void
  batchReject: (taskIds: string[]) => void
  toggleShowAutoAnnotations: () => void
  setActiveAnnotationType: (type: AnnotationType) => void
  resetAnnotations: () => void

  // Auto annotation
  autoAnnotateDocument: (content: string, documentName?: string) => Promise<NLPAnnotationResult | null>
  loadAutoAnnotations: (taskId: string, content: string) => Promise<void>
}

// Mock data for demonstration
const mockTasks: AnnotationTask[] = [
  {
    id: '1',
    documentId: 'doc1',
    documentName: '2024数字化转型指南.pdf',
    status: 'pending',
    autoAnnotations: [
      { type: 'category', value: '政策文件', confidence: 0.95 },
      { type: 'entity', value: '北京市', confidence: 0.92, location: 'region' },
      { type: 'entity', value: '2024年', confidence: 0.98, location: 'time' },
      { type: 'keyword', value: '数字化转型', confidence: 0.89 },
      { type: 'keyword', value: '人工智能', confidence: 0.87 },
    ],
    manualAnnotations: [],
    createdAt: '2024-03-15T10:30:00Z',
  },
  {
    id: '2',
    documentId: 'doc2',
    documentName: '企业数据安全管理办法.docx',
    status: 'in_progress',
    autoAnnotations: [
      { type: 'category', value: '管理制度', confidence: 0.88 },
      { type: 'entity', value: '上海浦东新区', confidence: 0.85, location: 'region' },
      { type: 'entity', value: '500万元', confidence: 0.91, location: 'number' },
      { type: 'keyword', value: '数据安全', confidence: 0.94 },
    ],
    manualAnnotations: [
      { type: 'category', value: '管理制度', verified: true },
      { type: 'keyword', value: '网络安全', verified: true },
    ],
    createdAt: '2024-03-14T14:20:00Z',
  },
  {
    id: '3',
    documentId: 'doc3',
    documentName: '人工智能发展规划纲要.pdf',
    status: 'approved',
    autoAnnotations: [
      { type: 'category', value: '规划文件', confidence: 0.97 },
      { type: 'entity', value: '科技部', confidence: 0.93, location: 'organization' },
      { type: 'entity', value: '2030年', confidence: 0.96, location: 'time' },
    ],
    manualAnnotations: [
      { type: 'category', value: '规划文件', verified: true },
      { type: 'keyword', value: '人工智能', verified: true },
      { type: 'keyword', value: '技术创新', verified: true },
    ],
    createdAt: '2024-03-13T09:00:00Z',
    reviewedAt: '2024-03-13T15:30:00Z',
    reviewer: '李四',
  },
  {
    id: '4',
    documentId: 'doc4',
    documentName: '智慧城市建设方案.pdf',
    status: 'rejected',
    autoAnnotations: [
      { type: 'category', value: '技术方案', confidence: 0.72 },
      { type: 'entity', value: '深圳市', confidence: 0.88, location: 'region' },
    ],
    manualAnnotations: [
      { type: 'category', value: '技术方案', verified: false },
    ],
    createdAt: '2024-03-12T11:00:00Z',
    reviewedAt: '2024-03-12T16:00:00Z',
    reviewer: '王五',
  },
  {
    id: '5',
    documentId: 'doc5',
    documentName: '云计算服务采购合同.pdf',
    status: 'pending',
    autoAnnotations: [
      { type: 'category', value: '合同文件', confidence: 0.91 },
      { type: 'entity', value: '华为技术有限公司', confidence: 0.95, location: 'organization' },
      { type: 'entity', value: '1200万元', confidence: 0.89, location: 'number' },
      { type: 'keyword', value: '云计算', confidence: 0.92 },
    ],
    manualAnnotations: [],
    createdAt: '2024-03-15T16:00:00Z',
  },
]

const mockDocumentContent: DocumentContent = {
  id: 'doc1',
  content: `数字化转型指南

第一章 总则

第一条 为深入贯彻落实国家数字化发展战略，加快推进各领域数字化转型，特制定本指南。

第二条 本指南适用于各级政府机关、企事业单位和社会组织开展数字化转型工作。

第三条 数字化转型是指利用数字技术对组织架构、业务流程、服务模式等进行全面重塑的过程。

第二章 主要目标

第四条 到2025年，基本建成数字政府体系框架，政府数字化履职能力显著提升。

第五条 数字化转型应坚持以下原则：
（一）统筹规划、分步实施；
（二）需求导向、服务优先；
（三）安全可控、绿色发展；
（四）开放共享、协同创新。

第三章 重点任务

第六条 加强数字基础设施建设，构建安全可靠的数字底座。

第七条 推进数据资源体系建设，实现数据要素价值化。

第八条 深化数字化应用，提升治理效能和服务水平。

第四章 保障措施

第九条 建立健全数字化转型工作机制，明确责任分工。

第十条 加大资金投入力度，保障数字化转型顺利推进。

本指南自发布之日起施行。

北京市人民政府
2024年3月1日`,
  highlights: [
    { start: 0, end: 7, type: 'keyword', color: '#22c55e', label: '数字化转型' },
    { start: 73, end: 80, type: 'keyword', color: '#22c55e', label: '数字化' },
    { start: 117, end: 124, type: 'entity', color: '#3b82f6', label: '2025年' },
    { start: 378, end: 385, type: 'entity', color: '#eab308', label: '北京市' },
    { start: 400, end: 409, type: 'entity', color: '#3b82f6', label: '2024年3月1日' },
  ],
}

const entityTypes: { id: EntityType; label: string; color: string }[] = [
  { id: 'region', label: '地区', color: '#eab308' },
  { id: 'time', label: '时间', color: '#3b82f6' },
  { id: 'number', label: '数值', color: '#22c55e' },
  { id: 'organization', label: '组织', color: '#d946ef' },
]

const calculateStats = (tasks: AnnotationTask[]): AnnotationStats => ({
  pending: tasks.filter(t => t.status === 'pending').length,
  inProgress: tasks.filter(t => t.status === 'in_progress').length,
  approved: tasks.filter(t => t.status === 'approved').length,
  rejected: tasks.filter(t => t.status === 'rejected').length,
})

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  // Initial state
  tasks: mockTasks,
  filteredTasks: mockTasks,
  selectedTaskId: null,
  statusFilter: 'all',
  searchQuery: '',
  stats: calculateStats(mockTasks),
  currentDocument: null,
  autoAnnotations: [],
  manualAnnotations: [],
  isAnnotating: false,
  showAutoAnnotations: true,
  activeAnnotationType: 'category',
  entityTypes,

  // Actions
  setStatusFilter: (status) => {
    const { tasks, searchQuery } = get()
    let filtered = tasks
    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status)
    }
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.documentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    set({ statusFilter: status, filteredTasks: filtered })
  },

  setSearchQuery: (query) => {
    const { tasks, statusFilter } = get()
    let filtered = tasks
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }
    if (query) {
      filtered = filtered.filter(t =>
        t.documentName.toLowerCase().includes(query.toLowerCase())
      )
    }
    set({ searchQuery: query, filteredTasks: filtered })
  },

  selectTask: (taskId) => {
    const { tasks } = get()
    if (!taskId) {
      set({
        selectedTaskId: null,
        currentDocument: null,
        autoAnnotations: [],
        manualAnnotations: [],
      })
      return
    }

    const task = tasks.find(t => t.id === taskId)
    if (task) {
      // Update task status to in_progress if it was pending
      const updatedTasks = tasks.map(t =>
        t.id === taskId && t.status === 'pending'
          ? { ...t, status: 'in_progress' as const }
          : t
      )
      set({
        selectedTaskId: taskId,
        currentDocument: mockDocumentContent, // In real app, fetch by documentId
        autoAnnotations: task.autoAnnotations,
        manualAnnotations: task.manualAnnotations,
        tasks: updatedTasks,
        stats: calculateStats(updatedTasks),
        filteredTasks: get().filteredTasks.map(t =>
          t.id === taskId && t.status === 'pending'
            ? { ...t, status: 'in_progress' as const }
            : t
        ),
      })
    }
  },

  addManualAnnotation: (annotation) => {
    const { manualAnnotations } = get()
    const newAnnotation: ManualAnnotation = {
      ...annotation,
      verified: true,
    }
    set({ manualAnnotations: [...manualAnnotations, newAnnotation] })
  },

  removeManualAnnotation: (index) => {
    const { manualAnnotations } = get()
    set({
      manualAnnotations: manualAnnotations.filter((_, i) => i !== index)
    })
  },

  verifyAnnotation: (index, verified) => {
    const { manualAnnotations } = get()
    const updated = manualAnnotations.map((a, i) =>
      i === index ? { ...a, verified } : a
    )
    set({ manualAnnotations: updated })
  },

  approveTask: (taskId) => {
    const { tasks, manualAnnotations } = get()
    const updatedTasks = tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: 'approved' as const,
            reviewedAt: new Date().toISOString(),
            reviewer: '张三', // In real app, use current user
            manualAnnotations: [...manualAnnotations]
          }
        : t
    )
    set({
      tasks: updatedTasks,
      stats: calculateStats(updatedTasks),
      filteredTasks: get().filteredTasks.map(t =>
        t.id === taskId
          ? { ...t, status: 'approved' as const, reviewedAt: new Date().toISOString() }
          : t
      ),
      selectedTaskId: null,
      currentDocument: null,
      autoAnnotations: [],
      manualAnnotations: [],
    })
  },

  rejectTask: (taskId, _reason) => {
    const { tasks, manualAnnotations } = get()
    const updatedTasks = tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewer: '张三',
            manualAnnotations: [...manualAnnotations]
          }
        : t
    )
    set({
      tasks: updatedTasks,
      stats: calculateStats(updatedTasks),
      filteredTasks: get().filteredTasks.map(t =>
        t.id === taskId
          ? { ...t, status: 'rejected' as const, reviewedAt: new Date().toISOString() }
          : t
      ),
      selectedTaskId: null,
      currentDocument: null,
      autoAnnotations: [],
      manualAnnotations: [],
    })
  },

  batchApprove: (taskIds) => {
    const { tasks } = get()
    const updatedTasks = tasks.map(t =>
      taskIds.includes(t.id)
        ? {
            ...t,
            status: 'approved' as const,
            reviewedAt: new Date().toISOString(),
            reviewer: '张三'
          }
        : t
    )
    set({
      tasks: updatedTasks,
      stats: calculateStats(updatedTasks),
      filteredTasks: get().filteredTasks.map(t =>
        taskIds.includes(t.id)
          ? { ...t, status: 'approved' as const, reviewedAt: new Date().toISOString() }
          : t
      ),
    })
  },

  batchReject: (taskIds) => {
    const { tasks } = get()
    const updatedTasks = tasks.map(t =>
      taskIds.includes(t.id)
        ? {
            ...t,
            status: 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewer: '张三'
          }
        : t
    )
    set({
      tasks: updatedTasks,
      stats: calculateStats(updatedTasks),
      filteredTasks: get().filteredTasks.map(t =>
        taskIds.includes(t.id)
          ? { ...t, status: 'rejected' as const, reviewedAt: new Date().toISOString() }
          : t
      ),
    })
  },

  toggleShowAutoAnnotations: () => {
    set((state) => ({ showAutoAnnotations: !state.showAutoAnnotations }))
  },

  setActiveAnnotationType: (type) => {
    set({ activeAnnotationType: type })
  },

  resetAnnotations: () => {
    const { selectedTaskId, tasks } = get()
    if (selectedTaskId) {
      const task = tasks.find(t => t.id === selectedTaskId)
      if (task) {
        set({ manualAnnotations: task.manualAnnotations })
      }
    }
  },

  // Auto annotate document using NLP service
  autoAnnotateDocument: async (content, documentName) => {
    try {
      const response = await fetch(API_BASE_WITH_PATH('/api/annotate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, documentName }),
      })

      if (!response.ok) {
        throw new Error('Annotation service error')
      }

      const result: NLPAnnotationResult = await response.json()
      return result
    } catch (error) {
      console.error('Auto annotation failed:', error)
      return null
    }
  },

  // Load auto annotations for a task
  loadAutoAnnotations: async (taskId, content) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return

    const result = await get().autoAnnotateDocument(content, task.documentName)
    if (!result || !result.success) return

    // Convert NLP result to AutoAnnotation format
    const autoAnnotations: AutoAnnotation[] = []

    // Add entities
    result.entities.forEach((entity: EntityAnnotation) => {
      autoAnnotations.push({
        type: 'entity',
        value: entity.value,
        confidence: entity.confidence,
        location: entity.type,
      })
    })

    // Add keywords
    result.keywords.forEach((keyword: KeywordAnnotation) => {
      autoAnnotations.push({
        type: 'keyword',
        value: keyword.keyword,
        confidence: keyword.confidence,
      })
    })

    // Add categories
    result.categories.forEach((category: CategoryAnnotation) => {
      autoAnnotations.push({
        type: 'category',
        value: category.category,
        confidence: category.confidence,
      })
    })

    // Update task with auto annotations
    const updatedTasks = get().tasks.map(t =>
      t.id === taskId ? { ...t, autoAnnotations } : t
    )
    set({ tasks: updatedTasks })
  },
}))
