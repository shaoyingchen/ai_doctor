import { create } from 'zustand'
import type { SearchResult } from '@/types'

export type SearchMode = 'hybrid' | 'semantic' | 'keyword'
export type DocumentType = 'all' | 'official' | 'policy' | 'internal' | 'legal'
export type SortBy = 'relevance' | 'date'
export type TimeRange = 'all' | 'today' | 'week' | 'month' | 'year'

interface FilterState {
  documentType: DocumentType
  timeRange: TimeRange
  knowledgeBase: string
}

interface SearchState {
  // Search state
  query: string
  searchMode: SearchMode
  isSearching: boolean
  results: SearchResult[]
  totalResults: number
  searchTime: number | null

  // Filters
  filters: FilterState
  sortBy: SortBy

  // Bookmarks
  bookmarkedIds: Set<string>

  // Actions
  setQuery: (query: string) => void
  setSearchMode: (mode: SearchMode) => void
  setDocumentType: (type: DocumentType) => void
  setTimeRange: (range: TimeRange) => void
  setKnowledgeBase: (kb: string) => void
  setSortBy: (sort: SortBy) => void
  toggleBookmark: (id: string) => void
  search: () => void
  clearSearch: () => void
}

// Mock search results for demonstration
const mockResults: SearchResult[] = [
  {
    id: '1',
    title: '2024年数字化转型工作指导意见',
    excerpt: '为深入贯彻落实国家数字化发展战略，加快推进本单位数字化转型工作，提升数字化治理能力，现就2024年数字化转型工作提出如下意见...',
    highlightedExcerpt: '为深入贯彻落实国家数字化发展战略，加快推进本单位<mark>数字化转型</mark>工作，提升数字化治理能力，现就2024年<mark>数字化转型</mark>工作提出如下意见...',
    documentType: 'official',
    knowledgeBase: '公共政策库',
    matchScore: 98,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    title: '数据安全管理办法（试行）',
    excerpt: '第一条 为加强数据安全管理，保障数据安全，促进数据开发利用，根据《中华人民共和国数据安全法》等法律法规，结合本单位实际，制定本办法...',
    highlightedExcerpt: '第一条 为加强<mark>数据安全</mark>管理，保障<mark>数据安全</mark>，促进数据开发利用，根据《中华人民共和国<mark>数据安全</mark>法》等法律法规，结合本单位实际，制定本办法...',
    documentType: 'internal',
    knowledgeBase: '单位库',
    matchScore: 95,
    createdAt: '2024-02-20'
  },
  {
    id: '3',
    title: '人工智能产业发展政策解读',
    excerpt: '近年来，人工智能技术快速发展，已成为推动经济社会高质量发展的重要引擎。本政策文件从产业发展、技术创新、人才培养等多个维度...',
    highlightedExcerpt: '近年来，<mark>人工智能</mark>技术快速发展，已成为推动经济社会高质量发展的重要引擎。本政策文件从产业发展、技术创新、<mark>人才培养</mark>等多个维度...',
    documentType: 'policy',
    knowledgeBase: '公共政策库',
    matchScore: 92,
    createdAt: '2024-03-10'
  },
  {
    id: '4',
    title: '网络安全等级保护基本要求',
    excerpt: '本标准规定了网络安全等级保护的基本要求，包括安全物理环境、安全通信网络、安全区域边界、安全计算环境、安全管理中心等方面的要求...',
    highlightedExcerpt: '本标准规定了<mark>网络安全</mark>等级保护的基本要求，包括安全物理环境、安全通信网络、安全区域边界、安全计算环境、安全管理中心等方面的要求...',
    documentType: 'legal',
    knowledgeBase: '国家标准规范',
    matchScore: 89,
    createdAt: '2024-01-05'
  },
  {
    id: '5',
    title: '信息化项目建设管理规范',
    excerpt: '为规范信息化项目建设管理，提高项目建设质量和效率，降低建设风险，根据国家有关规定，结合本单位实际，制定本规范...',
    highlightedExcerpt: '为规范<mark>信息化项目</mark>建设管理，提高项目建设质量和效率，降低建设风险，根据国家有关规定，结合本单位实际，制定本规范...',
    documentType: 'internal',
    knowledgeBase: '单位库',
    matchScore: 87,
    createdAt: '2024-02-28'
  }
]

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  query: '',
  searchMode: 'hybrid',
  isSearching: false,
  results: [],
  totalResults: 0,
  searchTime: null,
  filters: {
    documentType: 'all',
    timeRange: 'all',
    knowledgeBase: 'all'
  },
  sortBy: 'relevance',
  bookmarkedIds: new Set<string>(),

  // Actions
  setQuery: (query) => set({ query }),

  setSearchMode: (mode) => set({ searchMode: mode }),

  setDocumentType: (type) => set((state) => ({
    filters: { ...state.filters, documentType: type }
  })),

  setTimeRange: (range) => set((state) => ({
    filters: { ...state.filters, timeRange: range }
  })),

  setKnowledgeBase: (kb) => set((state) => ({
    filters: { ...state.filters, knowledgeBase: kb }
  })),

  setSortBy: (sort) => set({ sortBy: sort }),

  toggleBookmark: (id) => set((state) => {
    const newBookmarkedIds = new Set(state.bookmarkedIds)
    if (newBookmarkedIds.has(id)) {
      newBookmarkedIds.delete(id)
    } else {
      newBookmarkedIds.add(id)
    }
    return { bookmarkedIds: newBookmarkedIds }
  }),

  search: () => {
    const { query, filters, sortBy } = get()
    if (!query.trim()) {
      set({ results: [], totalResults: 0, searchTime: null })
      return
    }

    set({ isSearching: true })

    // Simulate search delay
    setTimeout(() => {
      let filteredResults = [...mockResults]

      // Filter by document type
      if (filters.documentType !== 'all') {
        const typeMap: Record<string, string> = {
          official: 'official',
          policy: 'policy',
          internal: 'internal',
          legal: 'legal'
        }
        filteredResults = filteredResults.filter(
          (r) => r.documentType === typeMap[filters.documentType]
        )
      }

      // Sort results
      if (sortBy === 'date') {
        filteredResults.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else {
        filteredResults.sort((a, b) => b.matchScore - a.matchScore)
      }

      set({
        results: filteredResults,
        totalResults: filteredResults.length,
        searchTime: Math.random() * 0.5 + 0.1, // Simulated search time
        isSearching: false
      })
    }, 500)
  },

  clearSearch: () => set({
    query: '',
    results: [],
    totalResults: 0,
    searchTime: null,
    filters: {
      documentType: 'all',
      timeRange: 'all',
      knowledgeBase: 'all'
    }
  })
}))