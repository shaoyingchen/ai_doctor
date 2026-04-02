import { create } from 'zustand'
import type { Document, KnowledgeBase } from '@/types'

// Tree node type for knowledge base hierarchy
export interface KBTreeNode {
  id: string
  name: string
  type: 'kb' | 'folder'
  parentId?: string
  knowledgeBaseType?: KnowledgeBase['type']
  documentCount?: number
  children?: KBTreeNode[]
}

// View mode for the file table
export type ViewMode = 'files' | 'pipeline'

// Parse status for pipeline view
export type ParseStatus = 'pending' | 'parsing' | 'parsed' | 'failed'

// File version info
export interface FileVersion {
  version: string
  updatedAt: string
  updatedBy?: string
}

// Selected file with metadata
export interface SelectedFile extends Document {
  versions?: FileVersion[]
  parseDetails?: {
    chunks: number
    vectors: number
    error?: string
  }
}

interface KBState {
  // Knowledge base tree
  knowledgeBases: KBTreeNode[]
  selectedKBId: string | null
  expandedNodes: string[]

  // Files
  files: Document[]
  selectedFileIds: string[]
  searchQuery: string

  // View mode
  viewMode: ViewMode

  // Selected file details
  selectedFile: SelectedFile | null

  // Actions
  setKnowledgeBases: (kbs: KBTreeNode[]) => void
  selectKB: (id: string | null) => void
  toggleNode: (id: string) => void
  setFiles: (files: Document[]) => void
  selectFiles: (ids: string[]) => void
  toggleFileSelection: (id: string) => void
  selectAllFiles: () => void
  clearFileSelection: () => void
  setSearchQuery: (query: string) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedFile: (file: SelectedFile | null) => void

  // Batch operations
  deleteSelectedFiles: () => void
  parseSelectedFiles: () => void
}

// Mock data for initial state
const mockKnowledgeBases: KBTreeNode[] = [
  {
    id: 'kb-1',
    name: '个人库',
    type: 'kb',
    knowledgeBaseType: 'personal',
    documentCount: 12,
    children: [
      { id: 'folder-1', name: '工作文档', type: 'folder', parentId: 'kb-1', documentCount: 5 },
      { id: 'folder-2', name: '学习资料', type: 'folder', parentId: 'kb-1', documentCount: 7 },
    ],
  },
  {
    id: 'kb-2',
    name: '单位库',
    type: 'kb',
    knowledgeBaseType: 'department',
    documentCount: 45,
    children: [
      { id: 'folder-3', name: '项目文档', type: 'folder', parentId: 'kb-2', documentCount: 20 },
      { id: 'folder-4', name: '会议纪要', type: 'folder', parentId: 'kb-2', documentCount: 15 },
      { id: 'folder-5', name: '技术文档', type: 'folder', parentId: 'kb-2', documentCount: 10 },
    ],
  },
  {
    id: 'kb-3',
    name: '公共库',
    type: 'kb',
    knowledgeBaseType: 'public',
    documentCount: 128,
    children: [
      { id: 'folder-6', name: '政策法规', type: 'folder', parentId: 'kb-3', documentCount: 30 },
      { id: 'folder-7', name: '标准规范', type: 'folder', parentId: 'kb-3', documentCount: 50 },
      { id: 'folder-8', name: '行业报告', type: 'folder', parentId: 'kb-3', documentCount: 48 },
    ],
  },
]

const mockFiles: Document[] = [
  {
    id: 'doc-1',
    name: '2024年数字化转型报告.pdf',
    type: 'pdf',
    size: 2048576,
    knowledgeBaseId: 'kb-1',
    status: 'parsed',
    version: 'v1.2',
    tags: ['数字化', '转型', '报告'],
    category: '工作文档',
    createdAt: '2024-03-15T10:30:00Z',
    updatedAt: '2024-03-20T14:20:00Z',
    parsedAt: '2024-03-15T11:00:00Z',
  },
  {
    id: 'doc-2',
    name: '产品需求说明书.docx',
    type: 'docx',
    size: 512000,
    knowledgeBaseId: 'kb-1',
    status: 'parsing',
    version: 'v2.0',
    tags: ['产品', '需求'],
    category: '项目文档',
    createdAt: '2024-03-18T09:00:00Z',
    updatedAt: '2024-03-18T09:00:00Z',
  },
  {
    id: 'doc-3',
    name: '技术架构设计文档.md',
    type: 'md',
    size: 128000,
    knowledgeBaseId: 'kb-1',
    status: 'pending',
    version: 'v1.0',
    tags: ['技术', '架构'],
    category: '技术文档',
    createdAt: '2024-03-19T16:45:00Z',
    updatedAt: '2024-03-19T16:45:00Z',
  },
  {
    id: 'doc-4',
    name: '用户调研报告.pdf',
    type: 'pdf',
    size: 3072000,
    knowledgeBaseId: 'kb-1',
    status: 'failed',
    version: 'v1.0',
    tags: ['用户', '调研'],
    category: '工作文档',
    createdAt: '2024-03-10T11:20:00Z',
    updatedAt: '2024-03-10T11:20:00Z',
  },
  {
    id: 'doc-5',
    name: '项目管理规范.doc',
    type: 'doc',
    size: 256000,
    knowledgeBaseId: 'kb-2',
    status: 'parsed',
    version: 'v3.1',
    tags: ['项目管理', '规范'],
    category: '管理规范',
    createdAt: '2024-02-28T08:00:00Z',
    updatedAt: '2024-03-15T10:30:00Z',
    parsedAt: '2024-02-28T09:00:00Z',
  },
]

export const useKBStore = create<KBState>((set) => ({
  // Initial state
  knowledgeBases: mockKnowledgeBases,
  selectedKBId: 'kb-1',
  expandedNodes: ['kb-1', 'kb-2', 'kb-3'],
  files: mockFiles,
  selectedFileIds: [],
  searchQuery: '',
  viewMode: 'files',
  selectedFile: null,

  // Actions
  setKnowledgeBases: (kbs) => set({ knowledgeBases: kbs }),

  selectKB: (id) => set({ selectedKBId: id, selectedFileIds: [], selectedFile: null }),

  toggleNode: (id) => set((state) => ({
    expandedNodes: state.expandedNodes.includes(id)
      ? state.expandedNodes.filter((nid) => nid !== id)
      : [...state.expandedNodes, id],
  })),

  setFiles: (files) => set({ files }),

  selectFiles: (ids) => set({ selectedFileIds: ids }),

  toggleFileSelection: (id) => set((state) => {
    const isSelected = state.selectedFileIds.includes(id)
    const newSelection = isSelected
      ? state.selectedFileIds.filter((fid) => fid !== id)
      : [...state.selectedFileIds, id]
    return { selectedFileIds: newSelection }
  }),

  selectAllFiles: () => set((state) => ({
    selectedFileIds: state.files.map((f) => f.id),
  })),

  clearFileSelection: () => set({ selectedFileIds: [], selectedFile: null }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedFile: (file) => set({ selectedFile: file }),

  deleteSelectedFiles: () => set((state) => ({
    files: state.files.filter((f) => !state.selectedFileIds.includes(f.id)),
    selectedFileIds: [],
    selectedFile: null,
  })),

  parseSelectedFiles: () => set((state) => ({
    files: state.files.map((f) =>
      state.selectedFileIds.includes(f.id) && f.status === 'pending'
        ? { ...f, status: 'parsing' as const }
        : f
    ),
  })),
}))