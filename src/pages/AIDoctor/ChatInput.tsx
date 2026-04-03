import { useState, useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import {
  Paperclip,
  Mic,
  Database,
  Hash,
  Send,
  X,
  FileText,
  Loader2
} from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void
  disabled?: boolean
  className?: string
}

export function ChatInput({ onSend, disabled, className }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showKBPicker, setShowKBPicker] = useState(false)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message.trim(), attachments)
      setMessage('')
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording)
    // Voice recording logic would go here
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  return (
    <div className={cn("bg-white border-t border-slate-200 p-4", className)}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 pb-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-primary-50 text-slate-600 px-2.5 py-1.5 rounded-lg text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Tool Buttons */}
        <div className="flex items-center gap-0.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
            title="添加附件"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={handleVoiceRecord}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isRecording
                ? "text-red-500 bg-red-50"
                : "text-slate-400 hover:text-primary hover:bg-slate-100"
            )}
            title="语音输入"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowKBPicker(!showKBPicker)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showKBPicker
                ? "text-primary bg-primary-50"
                : "text-slate-400 hover:text-primary hover:bg-slate-100"
            )}
            title="@知识库"
          >
            <Database className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSkillPicker(!showSkillPicker)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showSkillPicker
                ? "text-primary bg-primary-50"
                : "text-slate-400 hover:text-primary hover:bg-slate-100"
            )}
            title="#技能"
          >
            <Hash className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white",
              "placeholder:text-slate-400 text-slate-700 text-sm",
              "min-h-[44px] max-h-[200px]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className="flex-shrink-0 rounded-xl"
          size="icon"
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* KB Picker Dropdown */}
      {showKBPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-64 z-10">
          <p className="text-sm font-medium text-slate-700 mb-2">选择知识库</p>
          <div className="space-y-1">
            {['公共政策库', '国家标准规范', '个人笔记'].map((kb, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md"
              >
                <Database className="w-4 h-4 inline mr-2" />
                {kb}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Skill Picker Dropdown */}
      {showSkillPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-64 z-10">
          <p className="text-sm font-medium text-slate-700 mb-2">选择技能</p>
          <div className="space-y-1">
            {['文档摘要', '政策解读', '对比分析', '知识提取'].map((skill, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md"
              >
                <Hash className="w-4 h-4 inline mr-2" />
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}