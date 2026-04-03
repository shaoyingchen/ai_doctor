import type { ChatMessage as ChatMessageType, SourceReference } from '@/types'
import { cn } from '@/lib/cn'
import { User, Bot, Copy, ThumbsUp, ThumbsDown, RotateCcw, Check, FileText, Database } from 'lucide-react'
import { useState } from 'react'

interface ChatMessageProps {
  message: ChatMessageType
  className?: string
}

function SourceCard({ source }: { source: SourceReference }) {
  const isVerified = source.confidence >= 0.9
  return (
    <div className="mt-3 bg-primary-50/50 border border-primary-100 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-1.5 text-primary-700 font-medium mb-2">
        <Database className="w-3.5 h-3.5" />
        <span>引用来源</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="text-slate-400">知识库:</span>
          <span>{source.knowledgeBase}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <FileText className="w-3 h-3 text-slate-400" />
          <span className="truncate">{source.document}</span>
          {source.location && <span className="text-slate-400">({source.location})</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">置信度:</span>
          <span className={cn(
            "font-medium",
            isVerified ? "text-green-600" : "text-yellow-600"
          )}>
            {Math.round(source.confidence * 100)}%
          </span>
          {isVerified && (
            <span className="flex items-center gap-1 text-green-600 text-xs">
              <Check className="w-3 h-3" />
              已验证
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "flex gap-3 py-4 px-6",
      isUser ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
        isUser ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 max-w-[80%]", isUser ? "text-right" : "text-left")}>
        <div className={cn(
          "inline-block rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-primary text-white rounded-tr-md"
            : "bg-white border border-slate-100 text-slate-700 rounded-tl-md"
        )}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        </div>

        {/* Source Cards - Only for AI messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.sources.map((source, index) => (
              <SourceCard key={index} source={source} />
            ))}
          </div>
        )}

        {/* Message Actions */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={handleCopy}
              className={cn(
                "p-1.5 rounded transition-colors",
                copied
                  ? "text-green-500 bg-green-50"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              title={copied ? "已复制" : "复制"}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="有帮助"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="无帮助"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded transition-colors"
              title="重新生成"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {message.verified !== undefined && (
              <span className={cn(
                "ml-2 text-xs px-2 py-0.5 rounded-full",
                message.verified
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              )}>
                {message.verified ? "已验证" : "待验证"}
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          "text-[10px] text-slate-400 mt-1 px-1",
          isUser ? "text-right" : "text-left"
        )}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}