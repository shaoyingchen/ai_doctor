import { create } from 'zustand'
import type { Statistics, HotDocument, KnowledgeGap } from '@/types'

interface UsageTrendData {
  date: string
  visits: number
  searches: number
  downloads: number
}

interface KBDistributionData {
  name: string
  value: number
  color: string
}

interface ParsingEfficiencyData {
  name: string
  total: number
  success: number
  failed: number
}

interface AnalyticsState {
  statistics: Statistics | null
  usageTrend: UsageTrendData[]
  kbDistribution: KBDistributionData[]
  parsingEfficiency: ParsingEfficiencyData[]
  hotDocuments: HotDocument[]
  knowledgeGaps: KnowledgeGap[]
  isLoading: boolean
  error: string | null
  fetchStatistics: () => Promise<void>
  fetchUsageTrend: () => Promise<void>
  fetchKBDistribution: () => Promise<void>
  fetchParsingEfficiency: () => Promise<void>
  fetchHotDocuments: () => Promise<void>
  fetchKnowledgeGaps: () => Promise<void>
  fetchAll: () => Promise<void>
}

// Mock data generators
const generateMockStatistics = (): Statistics => ({
  totalDocuments: 15680,
  totalKnowledgeBases: 42,
  monthlyVisits: 89420,
  activeUsers: 1247,
  accuracy: 94.6,
  growthRate: {
    documents: 12.5,
    visits: 23.8,
    users: 8.3,
  },
})

const generateMockUsageTrend = (): UsageTrendData[] => {
  const data: UsageTrendData[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      visits: Math.floor(Math.random() * 500) + 200,
      searches: Math.floor(Math.random() * 300) + 100,
      downloads: Math.floor(Math.random() * 100) + 20,
    })
  }
  return data
}

const generateMockKBDistribution = (): KBDistributionData[] => [
  { name: '个人库', value: 4520, color: '#22c55e' },
  { name: '单位库', value: 6830, color: '#0ea5e9' },
  { name: '公共库', value: 3280, color: '#d946ef' },
  { name: '业务库', value: 1050, color: '#eab308' },
]

const generateMockParsingEfficiency = (): ParsingEfficiencyData[] => [
  { name: 'PDF文档', total: 5200, success: 4980, failed: 220 },
  { name: 'Word文档', total: 3800, success: 3650, failed: 150 },
  { name: '文本文件', total: 2100, success: 2080, failed: 20 },
  { name: 'Markdown', total: 4580, success: 4520, failed: 60 },
]

const generateMockHotDocuments = (): HotDocument[] => [
  { id: '1', title: '2024年数字化转型指南', views: 8542, trend: 'up' },
  { id: '2', title: '人工智能技术应用白皮书', views: 7231, trend: 'up' },
  { id: '3', title: '数据安全管理办法', views: 6512, trend: 'stable' },
  { id: '4', title: '企业知识管理实践', views: 5890, trend: 'up' },
  { id: '5', title: '智能制造技术规范', views: 5234, trend: 'down' },
  { id: '6', title: '云计算服务标准', views: 4876, trend: 'stable' },
  { id: '7', title: '网络安全防护指南', views: 4521, trend: 'up' },
  { id: '8', title: '大数据分析报告', views: 4198, trend: 'stable' },
  { id: '9', title: '物联网应用案例', views: 3876, trend: 'up' },
  { id: '10', title: '区块链技术原理', views: 3654, trend: 'down' },
]

const generateMockKnowledgeGaps = (): KnowledgeGap[] => [
  { id: '1', keyword: '机器学习算法优化', searchCount: 1250, priority: 'urgent', status: 'identified' },
  { id: '2', keyword: '深度学习模型部署', searchCount: 980, priority: 'urgent', status: 'processing' },
  { id: '3', keyword: '自然语言处理应用', searchCount: 856, priority: 'medium', status: 'identified' },
  { id: '4', keyword: '数据标注规范', searchCount: 720, priority: 'medium', status: 'identified' },
  { id: '5', keyword: '知识图谱构建', searchCount: 650, priority: 'medium', status: 'processing' },
  { id: '6', keyword: '向量数据库选型', searchCount: 540, priority: 'low', status: 'identified' },
  { id: '7', keyword: 'RAG架构设计', searchCount: 480, priority: 'low', status: 'resolved' },
  { id: '8', keyword: '文档解析效率', searchCount: 420, priority: 'low', status: 'identified' },
]

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  statistics: null,
  usageTrend: [],
  kbDistribution: [],
  parsingEfficiency: [],
  hotDocuments: [],
  knowledgeGaps: [],
  isLoading: false,
  error: null,

  fetchStatistics: async () => {
    set({ isLoading: true, error: null })
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300))
      set({ statistics: generateMockStatistics(), isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch statistics', isLoading: false })
    }
  },

  fetchUsageTrend: async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      set({ usageTrend: generateMockUsageTrend() })
    } catch (error) {
      set({ error: 'Failed to fetch usage trend' })
    }
  },

  fetchKBDistribution: async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 150))
      set({ kbDistribution: generateMockKBDistribution() })
    } catch (error) {
      set({ error: 'Failed to fetch KB distribution' })
    }
  },

  fetchParsingEfficiency: async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 180))
      set({ parsingEfficiency: generateMockParsingEfficiency() })
    } catch (error) {
      set({ error: 'Failed to fetch parsing efficiency' })
    }
  },

  fetchHotDocuments: async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      set({ hotDocuments: generateMockHotDocuments() })
    } catch (error) {
      set({ error: 'Failed to fetch hot documents' })
    }
  },

  fetchKnowledgeGaps: async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 180))
      set({ knowledgeGaps: generateMockKnowledgeGaps() })
    } catch (error) {
      set({ error: 'Failed to fetch knowledge gaps' })
    }
  },

  fetchAll: async () => {
    const { fetchStatistics, fetchUsageTrend, fetchKBDistribution, fetchParsingEfficiency, fetchHotDocuments, fetchKnowledgeGaps } = get()
    set({ isLoading: true, error: null })
    try {
      await Promise.all([
        fetchStatistics(),
        fetchUsageTrend(),
        fetchKBDistribution(),
        fetchParsingEfficiency(),
        fetchHotDocuments(),
        fetchKnowledgeGaps(),
      ])
      set({ isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch analytics data', isLoading: false })
    }
  },
}))