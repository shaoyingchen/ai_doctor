import { Badge } from '@/components/ui/badge'
import { useSearchStore, type DocumentType, type TimeRange } from '@/stores/searchStore'
import { cn } from '@/lib/cn'

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'official', label: '公文' },
  { value: 'policy', label: '政策文件' },
  { value: 'internal', label: '内部制度' },
  { value: 'legal', label: '法律法规' }
]

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '最近一周' },
  { value: 'month', label: '最近一月' },
  { value: 'year', label: '最近一年' }
]

const knowledgeBases = [
  { value: 'all', label: '全部知识库' },
  { value: 'personal', label: '个人库' },
  { value: 'department', label: '单位库' },
  { value: 'public', label: '公共库' },
  { value: 'standards', label: '国家标准规范' }
]

export function FilterPanel() {
  const {
    filters,
    setDocumentType,
    setTimeRange,
    setKnowledgeBase,
    sortBy,
    setSortBy,
    totalResults,
    searchTime,
    results
  } = useSearchStore()

  return (
    <div className="space-y-4">
      {/* Quick Filters - Document Type */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500 mr-2">类型:</span>
        {documentTypes.map((type) => (
          <Badge
            key={type.value}
            variant={filters.documentType === type.value ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-all px-3 py-1',
              filters.documentType === type.value
                ? 'bg-primary text-white hover:bg-primary-600'
                : 'hover:bg-slate-100'
            )}
            onClick={() => setDocumentType(type.value)}
          >
            {type.label}
          </Badge>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="flex items-center gap-4 flex-wrap bg-slate-50 rounded-lg p-3">
        {/* Time Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">时间:</span>
          <select
            value={filters.timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="h-8 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Knowledge Base */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">知识库:</span>
          <select
            value={filters.knowledgeBase}
            onChange={(e) => setKnowledgeBase(e.target.value)}
            className="h-8 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {knowledgeBases.map((kb) => (
              <option key={kb.value} value={kb.value}>
                {kb.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-slate-500">排序:</span>
          <div className="flex rounded-md overflow-hidden border border-slate-200">
            <button
              onClick={() => setSortBy('relevance')}
              className={cn(
                'px-3 py-1 text-sm transition-colors',
                sortBy === 'relevance'
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              相关度
            </button>
            <button
              onClick={() => setSortBy('date')}
              className={cn(
                'px-3 py-1 text-sm transition-colors border-l border-slate-200',
                sortBy === 'date'
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              时间
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            找到 <span className="font-medium text-slate-700">{totalResults}</span> 条结果
            {searchTime && (
              <span className="ml-2">
                耗时 <span className="font-medium text-slate-700">{searchTime.toFixed(2)}s</span>
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}