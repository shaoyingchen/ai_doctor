import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFlywheelStore, type FeedbackType, type FeedbackStatus, type FlywheelStage } from '@/stores/flywheelStore'
import { cn } from '@/lib/cn'

// Icons
const FeedbackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
)

const EvaluationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const CompletionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const OptimizationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const CycleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const ThumbsUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
  </svg>
)

const ThumbsDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

// Flywheel Flow Diagram Component
function FlywheelFlowDiagram() {
  const { currentStage, setCurrentStage, isRunning, cycleCount, lastCycleTime, toggleFlywheel, runCycle } = useFlywheelStore()

  const stages: { id: FlywheelStage; label: string; icon: React.ReactNode }[] = [
    { id: 'feedback', label: '用户反馈', icon: <FeedbackIcon /> },
    { id: 'evaluation', label: '质量评估', icon: <EvaluationIcon /> },
    { id: 'completion', label: '知识补全', icon: <CompletionIcon /> },
    { id: 'optimization', label: '规则优化', icon: <OptimizationIcon /> },
  ]

  const formatTime = (date: Date | null) => {
    if (!date) return '--'
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)
    if (diff < 60) return `${diff}分钟前`
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
    return `${Math.floor(diff / 1440)}天前`
  }

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-green-800 flex items-center gap-2">
            <CycleIcon />
            知识运营飞轮
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="font-medium">循环次数:</span>
              <Badge variant="outlinePrimary">{cycleCount}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="font-medium">上次运行:</span>
              <span>{formatTime(lastCycleTime)}</span>
            </div>
            <Button
              size="sm"
              variant={isRunning ? 'outline' : 'default'}
              onClick={toggleFlywheel}
              className={cn(
                "text-xs",
                isRunning ? "border-green-500 text-green-600 hover:bg-green-50" : "bg-green-600 hover:bg-green-700"
              )}
            >
              {isRunning ? '暂停' : '启动'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={runCycle}
              className="text-xs border-green-500 text-green-600 hover:bg-green-50"
            >
              手动执行
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-2 py-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <button
                onClick={() => setCurrentStage(stage.id)}
                className={cn(
                  "flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all cursor-pointer",
                  currentStage === stage.id
                    ? "bg-green-500 text-white shadow-lg shadow-green-200 scale-105"
                    : "bg-white text-green-700 hover:bg-green-100 border border-green-200",
                  isRunning && currentStage === stage.id && "animate-pulse"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  currentStage === stage.id ? "bg-white/20" : "bg-green-100"
                )}>
                  {stage.icon}
                </div>
                <span className="text-sm font-medium">{stage.label}</span>
              </button>
              {index < stages.length - 1 && (
                <div className="mx-2 flex items-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
          {/* Cycle arrow back to start */}
          <div className="ml-2 flex items-center">
            <svg className="w-6 h-6 text-green-400 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm",
            isRunning ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span>{isRunning ? '飞轮运行中...' : '飞轮已暂停'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Feedback Collection Panel
function FeedbackCollectionPanel() {
  const { feedbackItems, feedbackCounts, updateFeedbackStatus } = useFlywheelStore()

  const getFeedbackIcon = (type: FeedbackType) => {
    switch (type) {
      case 'positive':
        return <div className="p-1.5 rounded-full bg-green-100"><ThumbsUpIcon /></div>
      case 'negative':
        return <div className="p-1.5 rounded-full bg-red-100"><ThumbsDownIcon /></div>
      case 'correction':
        return <div className="p-1.5 rounded-full bg-yellow-100"><EditIcon /></div>
    }
  }

  const getStatusBadge = (status: FeedbackStatus) => {
    const variants: Record<FeedbackStatus, { variant: 'success' | 'warning' | 'secondary' | 'info'; label: string }> = {
      pending: { variant: 'warning', label: '待处理' },
      processing: { variant: 'info', label: '处理中' },
      resolved: { variant: 'success', label: '已解决' },
      rejected: { variant: 'secondary', label: '已驳回' }
    }
    const { variant, label } = variants[status]
    return <Badge variant={variant}>{label}</Badge>
  }

  const getTypeLabel = (type: FeedbackType) => {
    const labels: Record<FeedbackType, string> = {
      positive: '好评',
      negative: '差评',
      correction: '纠错'
    }
    return labels[type]
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000 / 60)
    if (diff < 60) return `${diff}分钟前`
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
    return `${Math.floor(diff / 1440)}天前`
  }

  const pendingItems = feedbackItems.filter(f => f.status === 'pending' || f.status === 'processing')

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center justify-between">
          <span>反馈收集</span>
          <Badge variant="warning">{feedbackCounts.pending} 待处理</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ThumbsUpIcon />
            </div>
            <div className="text-xl font-bold text-green-600">{feedbackCounts.positive}</div>
            <div className="text-xs text-green-600">好评</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ThumbsDownIcon />
            </div>
            <div className="text-xl font-bold text-red-600">{feedbackCounts.negative}</div>
            <div className="text-xs text-red-600">差评</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <EditIcon />
            </div>
            <div className="text-xl font-bold text-yellow-600">{feedbackCounts.correction}</div>
            <div className="text-xs text-yellow-600">纠错</div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-lg p-3 hover:border-green-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                {getFeedbackIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">{getTypeLabel(item.type)}</Badge>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2">{item.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">{item.source}</span>
                    <span className="text-xs text-slate-400">{formatTime(item.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => updateFeedbackStatus(item.id, 'rejected')}
                >
                  忽略
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => updateFeedbackStatus(item.id, 'processing')}
                >
                  处理
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 bg-green-600 hover:bg-green-700"
                  onClick={() => updateFeedbackStatus(item.id, 'resolved', '已处理')}
                >
                  解决
                </Button>
              </div>
            </div>
          ))}
          {pendingItems.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p>暂无待处理反馈</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Quality Metrics Component
function QualityMetricsCard() {
  const { qualityMetrics } = useFlywheelStore()

  const metrics = [
    { key: 'accuracy', label: '准确率', value: qualityMetrics.accuracy, unit: '%', color: 'green' },
    { key: 'coverage', label: '覆盖率', value: qualityMetrics.coverage, unit: '%', color: 'blue' },
    { key: 'satisfaction', label: '满意度', value: qualityMetrics.satisfaction, unit: '%', color: 'purple' },
    { key: 'timeliness', label: '时效性', value: qualityMetrics.timeliness, unit: '%', color: 'yellow' },
  ]

  const getTrendIcon = () => {
    if (qualityMetrics.trend === 'up') {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
    if (qualityMetrics.trend === 'down') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center justify-between">
          <span>质量指标</span>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className="text-xs text-slate-500">较上周</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.key} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{metric.label}</span>
                <span className="font-semibold text-slate-800">{metric.value}{metric.unit}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    metric.color === 'green' && "bg-green-500",
                    metric.color === 'blue' && "bg-blue-500",
                    metric.color === 'purple' && "bg-purple-500",
                    metric.color === 'yellow' && "bg-yellow-500"
                  )}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// MetaPrompt Management Component
function MetaPromptPanel() {
  const { metaPrompts, activeMetaPrompt, setActiveMetaPrompt } = useFlywheelStore()

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center justify-between">
          <span>MetaPrompt 编排</span>
          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700">
            + 新版本
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active Version */}
        {activeMetaPrompt && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="success">当前版本</Badge>
              <span className="text-xs text-green-600">{activeMetaPrompt.version}</span>
            </div>
            <p className="text-sm text-green-800 line-clamp-2">{activeMetaPrompt.content}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-green-600">
              <span>{activeMetaPrompt.author}</span>
              <span>{formatDate(activeMetaPrompt.createdAt)}</span>
            </div>
          </div>
        )}

        {/* Version History */}
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          <div className="text-xs text-slate-500 font-medium">历史版本</div>
          {metaPrompts.filter(p => !p.isActive).map((prompt) => (
            <div
              key={prompt.id}
              className="border border-slate-200 rounded-lg p-3 hover:border-green-300 transition-colors cursor-pointer"
              onClick={() => setActiveMetaPrompt(prompt.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{prompt.version}</span>
                <span className="text-xs text-slate-400">{formatDate(prompt.createdAt)}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{prompt.changeLog}</p>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6 mt-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMetaPrompt(prompt.id)
                }}
              >
                激活此版本
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Knowledge Gaps Component
function KnowledgeGapsPanel() {
  const { knowledgeGaps, removeKnowledgeGap } = useFlywheelStore()

  const getPriorityConfig = (priority: 'urgent' | 'medium' | 'low') => {
    const configs = {
      urgent: { color: 'red', label: '紧急', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
      medium: { color: 'yellow', label: '中等', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
      low: { color: 'blue', label: '一般', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' }
    }
    return configs[priority]
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000 / 60)
    if (diff < 60) return `${diff}分钟前`
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
    return `${Math.floor(diff / 1440)}天前`
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center justify-between">
          <span>知识缺口识别</span>
          <Badge variant="info">{knowledgeGaps.length} 项</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[350px] overflow-y-auto">
          {knowledgeGaps.map((gap) => {
            const config = getPriorityConfig(gap.priority)
            return (
              <div
                key={gap.id}
                className={cn(
                  "border rounded-lg p-3",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={gap.priority === 'urgent' ? 'destructive' : gap.priority === 'medium' ? 'warning' : 'info'}>
                    {config.label}
                  </Badge>
                  <span className="text-xs text-slate-500">{formatTime(gap.lastOccurrence)}</span>
                </div>
                <h4 className="text-sm font-medium text-slate-800 mb-1">{gap.topic}</h4>
                <p className="text-xs text-slate-600 mb-2">{gap.suggestedAction}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">出现次数: {gap.occurrenceCount}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="text-xs h-6">
                      添加知识
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 text-slate-400"
                      onClick={() => removeKnowledgeGap(gap.id)}
                    >
                      忽略
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
          {knowledgeGaps.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p>暂无知识缺口</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Page Component
export default function Flywheel() {
  return (
    <div className="h-full flex flex-col p-4 gap-4 bg-slate-50">
      {/* Top: Flywheel Flow Diagram */}
      <FlywheelFlowDiagram />

      {/* Bottom: Two columns */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Feedback Collection */}
        <div className="w-[420px] flex-shrink-0">
          <FeedbackCollectionPanel />
        </div>

        {/* Right: Operations Dashboard */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Quality Metrics and MetaPrompt */}
          <div className="flex gap-4">
            <div className="flex-1">
              <QualityMetricsCard />
            </div>
            <div className="flex-1">
              <MetaPromptPanel />
            </div>
          </div>

          {/* Knowledge Gaps */}
          <div className="flex-1 min-h-0">
            <KnowledgeGapsPanel />
          </div>
        </div>
      </div>
    </div>
  )
}