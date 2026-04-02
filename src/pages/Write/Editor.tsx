import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useWriteStore } from '@/stores/writeStore'

// 图标组件
const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
)

const DocumentTextIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ContinueIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
)

const PolishIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const BookOpenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

interface EditorProps {
  className?: string
}

export function Editor({ className }: EditorProps) {
  const {
    content,
    setContent,
    selectedTemplate,
    isGenerating,
    setIsGenerating,
    taskConfig,
    addAIRecord,
  } = useWriteStore()

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // AI生成处理
  const handleGenerate = async () => {
    if (!selectedTemplate) {
      alert('请先选择一个模板')
      return
    }

    setIsGenerating(true)
    addAIRecord({
      type: 'generate',
      content: '开始生成文档内容...',
    })

    // 模拟AI生成
    setTimeout(() => {
      const generatedContent = `${selectedTemplate.content}

【AI生成内容】
根据您提供的任务信息：
- 发文单位：${taskConfig.organization || '待填写'}
- 主题：${taskConfig.topic || '待填写'}
- 日期：${taskConfig.date}

以上内容为AI自动生成，请根据实际情况进行修改和完善。`

      setContent(generatedContent)
      setIsGenerating(false)
      addAIRecord({
        type: 'generate',
        content: '文档内容生成完成',
      })
    }, 1500)
  }

  // 保存草稿
  const handleSave = async () => {
    setSaveStatus('saving')
    // 模拟保存
    setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  // AI辅助功能
  const handleAIAssist = (type: 'continue' | 'polish' | 'validate' | 'reference') => {
    const typeNames = {
      continue: '续写',
      polish: '润色',
      validate: '校验',
      reference: '参考',
    }

    addAIRecord({
      type,
      content: `${typeNames[type]}功能已触发，正在处理...`,
    })

    // 模拟处理
    setTimeout(() => {
      if (type === 'continue') {
        setContent(content + '\n\n【续写内容】\n此处为AI续写的内容，用于扩展文档...')
        addAIRecord({ type, content: '续写完成，已添加新段落' })
      } else if (type === 'polish') {
        addAIRecord({ type, content: '润色完成，文档已优化表达' })
      } else if (type === 'validate') {
        addAIRecord({ type, content: '格式校验完成，未发现明显问题' })
      } else {
        addAIRecord({ type, content: '已找到3个相关参考文档' })
      }
    }, 1000)
  }

  return (
    <div className={cn('flex flex-col h-full bg-slate-50', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedTemplate}
            className="gap-2"
          >
            <SparklesIcon />
            {isGenerating ? '生成中...' : 'AI生成'}
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            className="gap-2"
          >
            <SaveIcon />
            保存草稿
          </Button>
          {saveStatus === 'saving' && (
            <span className="text-sm text-slate-500">保存中...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600">已保存</span>
          )}
        </div>

        {selectedTemplate && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <DocumentTextIcon />
            <span>{selectedTemplate.name}</span>
          </div>
        )}
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden p-6">
        <Card className="h-full overflow-hidden">
          <div className="h-full overflow-y-auto p-8">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请选择模板开始写作，或直接在此输入内容..."
              className="w-full h-full min-h-[500px] resize-none border-0 focus:outline-none text-slate-800 leading-relaxed text-[15px] placeholder:text-slate-400"
            />
          </div>
        </Card>
      </div>

      {/* AI辅助工具栏 */}
      <div className="px-6 py-3 bg-white border-t border-slate-200">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">AI辅助：</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssist('continue')}
            disabled={!content || isGenerating}
            className="gap-1.5"
          >
            <ContinueIcon />
            续写
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssist('polish')}
            disabled={!content || isGenerating}
            className="gap-1.5"
          >
            <PolishIcon />
            润色
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssist('validate')}
            disabled={!content || isGenerating}
            className="gap-1.5"
          >
            <CheckCircleIcon />
            校验
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssist('reference')}
            disabled={isGenerating}
            className="gap-1.5"
          >
            <BookOpenIcon />
            参考
          </Button>
        </div>
      </div>
    </div>
  )
}