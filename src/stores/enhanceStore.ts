import { create } from 'zustand'
import type { QA } from '@/types'

export type EnhanceTab = 'qa' | 'generalize' | 'decompose' | 'dataset'

export interface SourceDocument {
  id: string
  name: string
  qaCount: number
  generalizeCount: number
  decomposeCount: number
  status: 'pending' | 'processing' | 'completed'
}

export interface Dataset {
  id: string
  name: string
  type: 'train' | 'valid' | 'test'
  recordCount: number
  createdAt: string
}

export interface GeneralizeItem {
  id: string
  originalQuestion: string
  variations: string[]
  status: 'pending' | 'approved' | 'rejected'
}

export interface DecomposeItem {
  id: string
  sourceText: string
  knowledgeUnits: string[]
  status: 'pending' | 'approved' | 'rejected'
}

export interface GenerationConfig {
  model: string
  granularity: 'fine' | 'medium' | 'coarse'
  maxQAPerDoc: number
  autoApprove: boolean
}

export interface QualityMetrics {
  totalQA: number
  approvedQA: number
  pendingQA: number
  avgConfidence: number
  coverageRate: number
}

interface EnhanceState {
  // Current tab
  activeTab: EnhanceTab

  // Source documents
  sourceDocuments: SourceDocument[]
  selectedDocument: string | null

  // QA data
  qaList: QA[]
  selectedQA: QA | null

  // Generalize data
  generalizeList: GeneralizeItem[]

  // Decompose data
  decomposeList: DecomposeItem[]

  // Datasets
  datasets: Dataset[]

  // Config
  generationConfig: GenerationConfig

  // Quality metrics
  qualityMetrics: QualityMetrics

  // UI state
  searchQuery: string
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected'

  // Actions
  setActiveTab: (tab: EnhanceTab) => void
  setSelectedDocument: (docId: string | null) => void
  setSelectedQA: (qa: QA | null) => void
  setSearchQuery: (query: string) => void
  setFilterStatus: (status: 'all' | 'pending' | 'approved' | 'rejected') => void
  approveQA: (qaId: string) => void
  rejectQA: (qaId: string) => void
  updateConfig: (config: Partial<GenerationConfig>) => void
  generateQA: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

// Mock data
const mockSourceDocuments: SourceDocument[] = [
  { id: '1', name: '数字化转型指南.pdf', qaCount: 45, generalizeCount: 120, decomposeCount: 15, status: 'completed' },
  { id: '2', name: '数据安全管理办法.docx', qaCount: 32, generalizeCount: 85, decomposeCount: 10, status: 'completed' },
  { id: '3', name: '人工智能发展规划.pdf', qaCount: 28, generalizeCount: 76, decomposeCount: 8, status: 'processing' },
  { id: '4', name: '云计算服务标准.docx', qaCount: 0, generalizeCount: 0, decomposeCount: 0, status: 'pending' },
  { id: '5', name: '网络安全条例.pdf', qaCount: 56, generalizeCount: 145, decomposeCount: 18, status: 'completed' },
]

const mockQAList: QA[] = [
  {
    id: '1',
    question: '什么是数字化转型？',
    answer: '数字化转型是指企业利用数字技术对业务流程、组织结构和商业模式进行全面重塑的过程。它不仅仅是技术的升级，更是企业运营方式的根本性变革。',
    sourceDocument: '数字化转型指南.pdf',
    sourceLocation: '第2章 概述',
    confidence: 0.95,
    status: 'pending',
    variations: ['数字化转型定义是什么？', '如何理解数字化转型？'],
    createdAt: '2024-03-15T10:30:00Z',
  },
  {
    id: '2',
    question: '数据安全管理的基本原则有哪些？',
    answer: '数据安全管理的基本原则包括：1. 最小权限原则；2. 数据分类分级原则；3. 全生命周期管理原则；4. 责任明确原则；5. 持续改进原则。',
    sourceDocument: '数据安全管理办法.docx',
    sourceLocation: '第三章 基本原则',
    confidence: 0.92,
    status: 'approved',
    variations: ['数据安全管理的原则是什么？', '如何理解数据安全管理原则？'],
    createdAt: '2024-03-15T11:00:00Z',
  },
  {
    id: '3',
    question: '人工智能发展规划的主要目标是什么？',
    answer: '人工智能发展规划的主要目标包括：到2025年，人工智能核心产业规模超过4000亿元，带动相关产业规模超过5万亿元；培育若干具有国际竞争力的人工智能领军企业。',
    sourceDocument: '人工智能发展规划.pdf',
    sourceLocation: '第二章 发展目标',
    confidence: 0.88,
    status: 'pending',
    variations: ['AI发展规划的目标是什么？'],
    createdAt: '2024-03-15T14:20:00Z',
  },
  {
    id: '4',
    question: '云计算服务的基本类型有哪些？',
    answer: '云计算服务的基本类型包括：IaaS（基础设施即服务）、PaaS（平台即服务）、SaaS（软件即服务）三种主要类型。此外还有FaaS（函数即服务）等新兴服务模式。',
    sourceDocument: '云计算服务标准.docx',
    sourceLocation: '第1章 服务类型',
    confidence: 0.97,
    status: 'rejected',
    variations: ['云计算有哪些服务类型？', '云服务的分类是什么？'],
    createdAt: '2024-03-16T09:15:00Z',
  },
  {
    id: '5',
    question: '网络安全等级保护有几个级别？',
    answer: '网络安全等级保护分为五个级别：第一级（自主保护级）、第二级（指导保护级）、第三级（监督保护级）、第四级（强制保护级）、第五级（专控保护级）。',
    sourceDocument: '网络安全条例.pdf',
    sourceLocation: '第四章 等级划分',
    confidence: 0.96,
    status: 'approved',
    variations: ['等保分为几级？', '网络安全等级保护如何分级？'],
    createdAt: '2024-03-16T10:45:00Z',
  },
]

const mockGeneralizeList: GeneralizeItem[] = [
  {
    id: '1',
    originalQuestion: '什么是数字化转型？',
    variations: ['数字化转型定义是什么？', '如何理解数字化转型？', '数字化转型的含义是什么？', '请解释数字化转型'],
    status: 'approved',
  },
  {
    id: '2',
    originalQuestion: '数据安全管理的基本原则有哪些？',
    variations: ['数据安全管理的原则是什么？', '如何理解数据安全管理原则？', '数据安全原则有哪些？'],
    status: 'pending',
  },
  {
    id: '3',
    originalQuestion: '人工智能发展规划的主要目标是什么？',
    variations: ['AI发展规划的目标是什么？', '人工智能规划目标有哪些？'],
    status: 'pending',
  },
]

const mockDecomposeList: DecomposeItem[] = [
  {
    id: '1',
    sourceText: '数字化转型是指企业利用数字技术对业务流程、组织结构和商业模式进行全面重塑的过程。',
    knowledgeUnits: ['数字化技术', '业务流程重塑', '组织结构变革', '商业模式创新'],
    status: 'approved',
  },
  {
    id: '2',
    sourceText: '数据安全管理办法规定了数据采集、存储、传输、处理、删除等全生命周期的安全要求。',
    knowledgeUnits: ['数据采集安全', '数据存储安全', '数据传输安全', '数据处理安全', '数据删除安全'],
    status: 'pending',
  },
]

const mockDatasets: Dataset[] = [
  { id: '1', name: 'QA训练集-v1', type: 'train', recordCount: 1250, createdAt: '2024-03-01' },
  { id: '2', name: 'QA验证集-v1', type: 'valid', recordCount: 350, createdAt: '2024-03-01' },
  { id: '3', name: 'QA测试集-v1', type: 'test', recordCount: 200, createdAt: '2024-03-01' },
]

const defaultConfig: GenerationConfig = {
  model: 'gpt-4',
  granularity: 'medium',
  maxQAPerDoc: 50,
  autoApprove: false,
}

const defaultMetrics: QualityMetrics = {
  totalQA: 161,
  approvedQA: 89,
  pendingQA: 52,
  avgConfidence: 0.93,
  coverageRate: 0.78,
}

export const useEnhanceStore = create<EnhanceState>((set) => ({
  // Initial state
  activeTab: 'qa',
  sourceDocuments: mockSourceDocuments,
  selectedDocument: null,
  qaList: mockQAList,
  selectedQA: null,
  generalizeList: mockGeneralizeList,
  decomposeList: mockDecomposeList,
  datasets: mockDatasets,
  generationConfig: defaultConfig,
  qualityMetrics: defaultMetrics,
  searchQuery: '',
  filterStatus: 'all',

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedDocument: (docId) => set({ selectedDocument: docId }),

  setSelectedQA: (qa) => set({ selectedQA: qa }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  approveQA: (qaId) => {
    set((state) => ({
      qaList: state.qaList.map((qa) =>
        qa.id === qaId ? { ...qa, status: 'approved' as const } : qa
      ),
      qualityMetrics: {
        ...state.qualityMetrics,
        approvedQA: state.qualityMetrics.approvedQA + 1,
        pendingQA: state.qualityMetrics.pendingQA - 1,
      },
    }))
  },

  rejectQA: (qaId) => {
    set((state) => ({
      qaList: state.qaList.map((qa) =>
        qa.id === qaId ? { ...qa, status: 'rejected' as const } : qa
      ),
      qualityMetrics: {
        ...state.qualityMetrics,
        pendingQA: state.qualityMetrics.pendingQA - 1,
      },
    }))
  },

  updateConfig: (config) => {
    set((state) => ({
      generationConfig: { ...state.generationConfig, ...config },
    }))
  },

  generateQA: () => {
    // Simulate generating new QA pairs
    const newQA: QA = {
      id: generateId(),
      question: '新生成的示例问题？',
      answer: '这是自动生成的示例答案，用于演示QA生成功能。',
      sourceDocument: '示例文档.pdf',
      sourceLocation: '自动生成',
      confidence: 0.85,
      status: 'pending',
      variations: [],
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      qaList: [newQA, ...state.qaList],
      qualityMetrics: {
        ...state.qualityMetrics,
        totalQA: state.qualityMetrics.totalQA + 1,
        pendingQA: state.qualityMetrics.pendingQA + 1,
      },
    }))
  },
}))