import { cn } from '@/lib/cn'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useWriteStore, type WriteTemplate } from '@/stores/writeStore'

// 图标组件
const FileTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const FolderIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
)

interface TemplatePanelProps {
  className?: string
}

export function TemplatePanel({ className }: TemplatePanelProps) {
  const { templates, selectedTemplate, setSelectedTemplate, taskConfig } = useWriteStore()

  // 按类别分组模板
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, WriteTemplate[]>)

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <FileTextIcon />
          写作模板
        </h2>
      </div>

      {/* 模板列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category}>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-3">
              <FolderIcon />
              {category}
            </div>
            <div className="space-y-2">
              {categoryTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    selectedTemplate?.id === template.id
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                      : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {template.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {template.description}
                      </div>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <div className="ml-2 flex-shrink-0 text-primary-600">
                        <CheckIcon />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 任务信息卡片 */}
      <div className="border-t border-slate-200 p-4">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm font-medium text-slate-700">任务信息</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">发文单位</span>
              <span className="text-slate-800 truncate max-w-[120px]">
                {taskConfig.organization || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">主题</span>
              <span className="text-slate-800 truncate max-w-[120px]">
                {taskConfig.topic || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">日期</span>
              <span className="text-slate-800">{taskConfig.date || '-'}</span>
            </div>
            {taskConfig.knowledgeBases.length > 0 && (
              <div className="text-sm">
                <span className="text-slate-500">参考知识库：</span>
                <span className="text-slate-800">{taskConfig.knowledgeBases.length}个</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}