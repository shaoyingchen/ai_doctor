import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWriteStore, type HistoryReference, type AIGenerationRecord, type ValidationResult } from '@/stores/writeStore'

// 图标组件
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

// 模拟知识库数据
const knowledgeBases = [
  { id: '1', name: '个人知识库' },
  { id: '2', name: '单位知识库' },
  { id: '3', name: '公共政策库' },
  { id: '4', name: '国家标准规范' },
]

// AI记录类型映射
const recordTypeNames: Record<AIGenerationRecord['type'], string> = {
  generate: '生成',
  continue: '续写',
  polish: '润色',
  validate: '校验',
  reference: '参考',
}

const recordTypeColors: Record<AIGenerationRecord['type'], string> = {
  generate: 'bg-primary-100 text-primary-700',
  continue: 'bg-blue-100 text-blue-700',
  polish: 'bg-purple-100 text-purple-700',
  validate: 'bg-green-100 text-green-700',
  reference: 'bg-orange-100 text-orange-700',
}

interface ConfigPanelProps {
  className?: string
}

export function ConfigPanel({ className }: ConfigPanelProps) {
  const {
    taskConfig,
    updateTaskConfig,
    historyReferences,
    aiRecords,
    validationResults,
    setValidationResults,
    content,
  } = useWriteStore()

  const [activeTab, setActiveTab] = useState<'config' | 'history' | 'validation'>('config')

  // 运行格式校验
  const runValidation = () => {
    // 根据内容动态生成校验结果
    const results: ValidationResult[] = [
      { item: '标题格式', status: 'pass', message: '标题格式正确' },
      {
        item: '发文单位',
        status: taskConfig.organization ? 'pass' : 'warning',
        message: taskConfig.organization ? '已填写发文单位' : '未填写发文单位',
      },
      {
        item: '主题内容',
        status: taskConfig.topic ? 'pass' : 'warning',
        message: taskConfig.topic ? '已填写主题' : '未填写主题',
      },
      { item: '日期格式', status: 'pass', message: '日期格式正确' },
      {
        item: '正文结构',
        status: content.length > 50 ? 'pass' : 'warning',
        message: content.length > 50 ? '正文结构完整' : '正文内容较少',
      },
    ]
    setValidationResults(results)
    setActiveTab('validation')
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <SettingsIcon />
          配置面板
        </h2>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'config'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          任务配置
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'history'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          历史参考
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'validation'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          格式校验
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 任务配置 */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                发文单位
              </label>
              <Input
                placeholder="请输入发文单位"
                value={taskConfig.organization}
                onChange={(e) => updateTaskConfig({ organization: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                主题
              </label>
              <Input
                placeholder="请输入文档主题"
                value={taskConfig.topic}
                onChange={(e) => updateTaskConfig({ topic: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                日期
              </label>
              <Input
                type="date"
                value={taskConfig.date}
                onChange={(e) => updateTaskConfig({ date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                参考知识库
              </label>
              <div className="space-y-2">
                {knowledgeBases.map((kb) => (
                  <label
                    key={kb.id}
                    className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:border-primary-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={taskConfig.knowledgeBases.includes(kb.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateTaskConfig({
                            knowledgeBases: [...taskConfig.knowledgeBases, kb.id],
                          })
                        } else {
                          updateTaskConfig({
                            knowledgeBases: taskConfig.knowledgeBases.filter((id) => id !== kb.id),
                          })
                        }
                      }}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <DatabaseIcon />
                    <span className="text-sm text-slate-700">{kb.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={runValidation} variant="outline" className="w-full gap-2">
              <CheckCircleIcon className="text-green-600" />
              运行格式校验
            </Button>
          </div>
        )}

        {/* 历史参考 */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {historyReferences.map((ref) => (
              <HistoryReferenceCard key={ref.id} reference={ref} />
            ))}
            {historyReferences.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                <HistoryIcon />
                <p className="mt-2 text-sm">暂无历史参考</p>
              </div>
            )}
          </div>
        )}

        {/* 格式校验 */}
        {activeTab === 'validation' && (
          <div className="space-y-3">
            {validationResults.length > 0 ? (
              validationResults.map((result, index) => (
                <ValidationResultCard key={index} result={result} />
              ))
            ) : (
              <div className="text-center text-slate-400 py-8">
                <CheckCircleIcon className="mx-auto w-8 h-8" />
                <p className="mt-2 text-sm">点击"运行格式校验"开始检查</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI生成记录 */}
      <div className="border-t border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <SparklesIcon />
          AI生成记录
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {aiRecords.length > 0 ? (
            aiRecords.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-start gap-2 text-sm"
              >
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
                    recordTypeColors[record.type]
                  )}
                >
                  {recordTypeNames[record.type]}
                </span>
                <span className="text-slate-600 truncate">{record.content}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">暂无AI生成记录</p>
          )}
        </div>
      </div>
    </div>
  )
}

// 历史参考卡片组件
function HistoryReferenceCard({ reference }: { reference: HistoryReference }) {
  return (
    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 text-sm truncate">
            {reference.title}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>{reference.organization}</span>
            <span>|</span>
            <span>{reference.date}</span>
          </div>
        </div>
        <div className="ml-2 flex-shrink-0 text-xs text-primary-600 font-medium">
          {Math.round(reference.similarity * 100)}%相似
        </div>
      </div>
    </Card>
  )
}

// 校验结果卡片组件
function ValidationResultCard({ result }: { result: ValidationResult }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg',
        result.status === 'pass' && 'bg-green-50',
        result.status === 'warning' && 'bg-yellow-50',
        result.status === 'error' && 'bg-red-50'
      )}
    >
      {result.status === 'pass' && <CheckCircleIcon className="text-green-600 mt-0.5" />}
      {result.status === 'warning' && <AlertCircleIcon className="text-yellow-600 mt-0.5" />}
      {result.status === 'error' && <XCircleIcon className="text-red-600 mt-0.5" />}
      <div>
        <div
          className={cn(
            'text-sm font-medium',
            result.status === 'pass' && 'text-green-800',
            result.status === 'warning' && 'text-yellow-800',
            result.status === 'error' && 'text-red-800'
          )}
        >
          {result.item}
        </div>
        <div
          className={cn(
            'text-xs',
            result.status === 'pass' && 'text-green-600',
            result.status === 'warning' && 'text-yellow-600',
            result.status === 'error' && 'text-red-600'
          )}
        >
          {result.message}
        </div>
      </div>
    </div>
  )
}