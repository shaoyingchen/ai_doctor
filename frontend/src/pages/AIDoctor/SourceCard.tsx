import type { SourceReference } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { FileText, Database, CheckCircle, AlertCircle } from 'lucide-react'

interface SourceCardProps {
  source: SourceReference
  className?: string
}

export function SourceCard({ source, className }: SourceCardProps) {
  const isVerified = source.confidence >= 0.9

  return (
    <div className={cn(
      "bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm",
      className
    )}>
      <div className="flex items-center gap-2 text-slate-600 mb-2">
        <FileText className="w-4 h-4" />
        <span className="font-medium">引用来源</span>
      </div>

      <div className="space-y-2">
        {/* Knowledge Base */}
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">知识库：</span>
          <span className="text-slate-700">{source.knowledgeBase}</span>
        </div>

        {/* Document */}
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">文档：</span>
          <span className="text-slate-700">{source.document}</span>
          {source.location && (
            <span className="text-slate-400 text-xs">({source.location})</span>
          )}
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-2">
          {isVerified ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
          )}
          <span className="text-slate-500">置信度：</span>
          <span className={cn(
            "font-medium",
            source.confidence >= 0.9 ? "text-green-600" :
            source.confidence >= 0.7 ? "text-yellow-600" : "text-red-600"
          )}>
            {Math.round(source.confidence * 100)}%
          </span>
          <Badge variant={isVerified ? "success" : "warning"} className="text-xs">
            {isVerified ? "已验证" : "待验证"}
          </Badge>
        </div>
      </div>
    </div>
  )
}