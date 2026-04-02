import type { ChatMessage as ChatMessageType } from '@/types'
import { SourceCard } from './SourceCard'
import { cn } from '@/lib/cn'
import { User, Bot, Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import { useState } from 'react'

interface ChatMessageProps {
  message: ChatMessageType
  className?: string
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
      "flex gap-4 p-4",
      isUser ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser ? "text-right" : "text-left"
      )}>
        <div className={cn(
          "inline-block rounded-xl px-4 py-3",
          isUser
            ? "bg-primary text-white rounded-tr-none"
            : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
        )}>
          <p className="whitespace-pre-wrap">{message.content}</p>
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
          <div className="flex items-center gap-2 mt-2">
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
              <Copy className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="有帮助"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="无帮助"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded transition-colors"
              title="重新生成"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Verification Badge */}
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
          "text-xs text-slate-400 mt-1",
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