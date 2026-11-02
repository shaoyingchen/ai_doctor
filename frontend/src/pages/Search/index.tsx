import { useState, useEffect, useCallback } from 'react'
import { Download, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSearchStore } from '@/stores/searchStore'
import { ResultCard } from './ResultCard'
import { FilterPanel } from './FilterPanel'
import { SearchBar } from './SearchBar'
import { cn } from '@/lib/cn'

// Results per page
const PAGE_SIZE = 5

export default function SearchPage() {
  const { results, isSearching, query, bookmarkedIds } = useSearchStore()
  const [currentPage, setCurrentPage] = useState(1)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Reset to first page when results change
  useEffect(() => {
    setCurrentPage(1)
  }, [results])

  // Calculate pagination
  const totalPages = Math.ceil(results.length / PAGE_SIZE)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedResults = results.slice(startIndex, startIndex + PAGE_SIZE)

  const handleExport = useCallback((format: 'csv' | 'json') => {
    // Create export data
    const exportData = results.map((r) => ({
      title: r.title,
      excerpt: r.excerpt,
      documentType: r.documentType,
      knowledgeBase: r.knowledgeBase,
      matchScore: r.matchScore,
      createdAt: r.createdAt
    }))

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'csv') {
      const headers = ['标题', '摘要', '文档类型', '知识库', '匹配度', '创建时间']
      const rows = exportData.map((d) =>
        [d.title, d.excerpt, d.documentType, d.knowledgeBase, d.matchScore, d.createdAt].join(',')
      )
      content = [headers.join(','), ...rows].join('\n')
      filename = 'search_results.csv'
      mimeType = 'text/csv'
    } else {
      content = JSON.stringify(exportData, null, 2)
      filename = 'search_results.json'
      mimeType = 'application/json'
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }, [results])

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-xl font-bold text-slate-800 mb-4">智能搜索</h1>
          <SearchBar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Show filters and results only when there's a query */}
          {query ? (
            <>
              {/* Filter Panel */}
              <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-4">
                <FilterPanel />
              </div>

              {/* Results */}
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">正在搜索...</p>
                  </div>
                </div>
              ) : results.length > 0 ? (
                <>
                  {/* Results Header with Export */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      {bookmarkedIds.size > 0 && (
                        <span className="px-2 py-1 bg-primary-50 text-primary rounded">
                          已收藏 {bookmarkedIds.size} 条
                        </span>
                      )}
                    </div>

                    {/* Export Button */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        导出结果
                      </Button>

                      {showExportMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 py-1 min-w-[120px]">
                          <button
                            onClick={() => handleExport('csv')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileDown className="w-4 h-4" />
                            导出 CSV
                          </button>
                          <button
                            onClick={() => handleExport('json')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileDown className="w-4 h-4" />
                            导出 JSON
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="space-y-4">
                    {paginatedResults.map((result) => (
                      <ResultCard key={result.id} result={result} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                              currentPage === page
                                ? 'bg-primary text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">未找到相关结果</h3>
                  <p className="text-slate-500">尝试使用其他关键词或调整筛选条件</p>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">智能知识检索</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-8">
                支持混合检索、语义检索和关键词检索三种模式，
                快速定位您需要的知识内容
              </p>

              {/* Quick Tips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-slate-800 mb-1">混合检索</h4>
                  <p className="text-sm text-slate-500">结合语义理解和关键词匹配</p>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-slate-800 mb-1">语义检索</h4>
                  <p className="text-sm text-slate-500">理解查询意图智能匹配</p>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-slate-800 mb-1">关键词检索</h4>
                  <p className="text-sm text-slate-500">精确匹配关键词内容</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}