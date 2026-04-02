import { FileText, Bookmark, Copy, ExternalLink, Calendar, Database } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSearchStore } from '@/stores/searchStore'
import type { SearchResult } from '@/types'
import { cn } from '@/lib/cn'

const documentTypeConfig: Record<string, { label: string; color: string }> = {
  official: { label: '公文', color: 'bg-blue-100 text-blue-700' },
  policy: { label: '政策文件', color: 'bg-green-100 text-green-700' },
  internal: { label: '内部制度', color: 'bg-orange-100 text-orange-700' },
  legal: { label: '法律法规', color: 'bg-purple-100 text-purple-700' }
}

interface ResultCardProps {
  result: SearchResult
}

export function ResultCard({ result }: ResultCardProps) {
  const { bookmarkedIds, toggleBookmark } = useSearchStore()
  const isBookmarked = bookmarkedIds.has(result.id)

  const typeConfig = documentTypeConfig[result.documentType] || {
    label: '文档',
    color: 'bg-slate-100 text-slate-700'
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result.excerpt)
  }

  return (
    <Card hover className="p-4 group">
      <div className="flex gap-4">
        {/* Document Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-slate-800 group-hover:text-primary transition-colors line-clamp-1">
              {result.title}
            </h3>
            <Badge className={cn('flex-shrink-0', typeConfig.color)}>
              {typeConfig.label}
            </Badge>
          </div>

          {/* Excerpt */}
          <p
            className="text-sm text-slate-600 mb-3 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: result.highlightedExcerpt }}
          />

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {result.createdAt}
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              {result.knowledgeBase}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary font-medium">
              匹配度: {result.matchScore}%
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-8 px-3 text-slate-600 hover:text-primary">
              <ExternalLink className="w-4 h-4 mr-1" />
              查看原文
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3',
                isBookmarked ? 'text-primary' : 'text-slate-600 hover:text-primary'
              )}
              onClick={() => toggleBookmark(result.id)}
            >
              <Bookmark
                className={cn('w-4 h-4 mr-1', isBookmarked && 'fill-primary')}
              />
              {isBookmarked ? '已收藏' : '收藏'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-slate-600 hover:text-primary"
              onClick={handleCopy}
            >
              <Copy className="w-4 h-4 mr-1" />
              复制
            </Button>
          </div>
        </div>

        {/* Match Score Visual */}
        <div className="flex-shrink-0 hidden sm:flex flex-col items-center justify-center">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="#e2e8f0"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="#22c55e"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(result.matchScore / 100) * 150.8} 150.8`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary">
              {result.matchScore}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}