import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFlywheelStore, type FeedbackType, type FeedbackStatus, type FlywheelStage } from '@/stores/flywheelStore'
import { cn } from '@/lib/cn'
import {
  MessageSquare,
  BarChart3,
  BookOpen,
  Settings,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Plus,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'

// Flywheel Flow Diagram Component
function FlywheelFlowDiagram() {
  const { currentStage, setCurrentStage, isRunning, cycleCount, lastCycleTime, toggleFlywheel, runCycle } = useFlywheelStore()

  const stages: { id: FlywheelStage; label: string; icon: React.ReactNode }[] = [
    { id: 'feedback', label: '用户反馈', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'evaluation', label: '质量评估', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'completion', label: '知识补全', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'optimization', label: '规则优化', icon: <Settings className="w-4 h-4" /> },
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
    <div className="bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <RefreshCw className="w-4 h-4" />
          </div>
          <h3 className="text-base font-semibold text-primary-800">知识运营飞轮</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-primary-700">
            <span className="text-primary-500">循环次数</span>
            <Badge variant="outlinePrimary" className="text-xs">{cycleCount}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary-700">
            <Clock className="w-3 h-3 text-primary-500" />
            <span>{formatTime(lastCycleTime)}</span>
          </div>
          <Button
            size="sm"
            variant={isRunning ? 'outline' : 'default'}
            onClick={toggleFlywheel}
            className="text-xs h-7"
          >
            {isRunning ? '暂停' : '启动'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={runCycle}
            className="text-xs h-7"
          >
            手动执行
          </Button>
        </div>
      </div>

      {/* Flow stages */}
      <div className="flex items-center justify-center gap-1">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => setCurrentStage(stage.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer",
                currentStage === stage.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-primary-700 hover:bg-primary-50 border border-primary-100"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded flex items-center justify-center",
                currentStage === stage.id ? "bg-white/20" : "bg-primary-100"
              )}>
                {stage.icon}
              </div>
              <span className="text-xs font-medium">{stage.label}</span>
            </button>
            {index < stages.length - 1 && (
              <ChevronRight className="w-4 h-4 text-primary-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center mt-3">
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs",
          isRunning ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-500"
        )}>
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            isRunning ? "bg-primary animate-pulse" : "bg-slate-400"
          )} />
          <span>{isRunning ? '飞轮运行中...' : '飞轮已暂停'}</span>
        </div>
      </div>
    </div>
  )
}

// Feedback Collection Panel
function FeedbackCollectionPanel() {
  const { feedbackItems, feedbackCounts, updateFeedbackStatus } = useFlywheelStore()

  const getFeedbackIcon = (type: FeedbackType) => {
    switch (type) {
      case 'positive':
        return <div className="p-1 rounded-full bg-primary-100"><ThumbsUp className="w-3 h-3 text-primary" /></div>
      case 'negative':
        return <div className="p-1 rounded-full bg-red-100"><ThumbsDown className="w-3 h-3 text-red-600" /></div>
      case 'correction':
        return <div className="p-1 rounded-full bg-amber-100"><Edit3 className="w-3 h-3 text-amber-600" /></div>
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
    return <Badge variant={variant} className="text-xs">{label}</Badge>
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
    <Card className="h-full border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between">
          <span>反馈收集</span>
          <Badge variant="warning" className="text-xs">{feedbackCounts.pending} 待处理</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary-50 rounded-lg p-2.5 text-center">
            <ThumbsUp className="w-4 h-4 mx-auto text-primary mb-1" />
            <div className="text-lg font-bold text-primary">{feedbackCounts.positive}</div>
            <div className="text-xs text-primary">好评</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2.5 text-center">
            <ThumbsDown className="w-4 h-4 mx-auto text-red-500 mb-1" />
            <div className="text-lg font-bold text-red-600">{feedbackCounts.negative}</div>
            <div className="text-xs text-red-600">差评</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-2.5 text-center">
            <Edit3 className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <div className="text-lg font-bold text-amber-600">{feedbackCounts.correction}</div>
            <div className="text-xs text-amber-600">纠错</div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className="border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-colors"
            >
              <div className="flex items-start gap-2">
                {getFeedbackIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">{getTypeLabel(item.type)}</Badge>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.content}</p>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-slate-400">
                    <span>{item.source}</span>
                    <span>{formatTime(item.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-6 px-2"
                  onClick={() => updateFeedbackStatus(item.id, 'rejected')}
                >
                  忽略
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-6 px-2"
                  onClick={() => updateFeedbackStatus(item.id, 'processing')}
                >
                  处理
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => updateFeedbackStatus(item.id, 'resolved', '已处理')}
                >
                  解决
                </Button>
              </div>
            </div>
          ))}
          {pendingItems.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">暂无待处理反馈</p>
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
    { key: 'accuracy', label: '准确率', value: qualityMetrics.accuracy, color: 'bg-primary' },
    { key: 'coverage', label: '覆盖率', value: qualityMetrics.coverage, color: 'bg-blue-500' },
    { key: 'satisfaction', label: '满意度', value: qualityMetrics.satisfaction, color: 'bg-purple-500' },
    { key: 'timeliness', label: '时效性', value: qualityMetrics.timeliness, color: 'bg-amber-500' },
  ]

  const getTrendIcon = () => {
    if (qualityMetrics.trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-primary" />
    }
    if (qualityMetrics.trend === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    }
    return <Minus className="w-4 h-4 text-slate-400" />
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between">
          <span>质量指标</span>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className="text-xs text-slate-500">较上周</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div key={metric.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{metric.label}</span>
                <span className="font-semibold text-slate-700">{metric.value}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", metric.color)}
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
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between">
          <span>MetaPrompt 编排</span>
          <Button size="sm" className="text-xs h-7">
            <Plus className="w-3 h-3 mr-1" />
            新版本
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Active Version */}
        {activeMetaPrompt && (
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="success" className="text-xs">当前版本</Badge>
              <span className="text-xs text-primary-600">{activeMetaPrompt.version}</span>
            </div>
            <p className="text-xs text-primary-800 line-clamp-2">{activeMetaPrompt.content}</p>
            <div className="flex items-center justify-between mt-1.5 text-xs text-primary-600">
              <span>{activeMetaPrompt.author}</span>
              <span>{formatDate(activeMetaPrompt.createdAt)}</span>
            </div>
          </div>
        )}

        {/* Version History */}
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          <div className="text-xs text-slate-500 font-medium">历史版本</div>
          {metaPrompts.filter(p => !p.isActive).map((prompt) => (
            <div
              key={prompt.id}
              className="border border-slate-100 rounded-lg p-2 hover:border-slate-200 transition-colors cursor-pointer"
              onClick={() => setActiveMetaPrompt(prompt.id)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-slate-700">{prompt.version}</span>
                <span className="text-xs text-slate-400">{formatDate(prompt.createdAt)}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{prompt.changeLog}</p>
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
      urgent: { label: '紧急', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' },
      medium: { label: '中等', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
      low: { label: '一般', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' }
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
    <Card className="h-full border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between">
          <span>知识缺口识别</span>
          <Badge variant="info" className="text-xs">{knowledgeGaps.length} 项</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {knowledgeGaps.map((gap) => {
            const config = getPriorityConfig(gap.priority)
            return (
              <div
                key={gap.id}
                className={cn("border rounded-lg p-3", config.bg, config.border)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant={gap.priority === 'urgent' ? 'destructive' : gap.priority === 'medium' ? 'warning' : 'info'} className="text-xs">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-slate-400">{formatTime(gap.lastOccurrence)}</span>
                </div>
                <h4 className="text-sm font-medium text-slate-800 mb-1">{gap.topic}</h4>
                <p className="text-xs text-slate-600 mb-2">{gap.suggestedAction}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">出现 {gap.occurrenceCount} 次</span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2 text-primary">
                      添加知识
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2 text-slate-400"
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
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 stroke-1" />
              <p className="text-sm">暂无知识缺口</p>
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
    <div className="h-full flex flex-col p-4 gap-4 bg-white">
      {/* Top: Flywheel Flow Diagram */}
      <FlywheelFlowDiagram />

      {/* Bottom: Two columns */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Feedback Collection */}
        <div className="w-[380px] flex-shrink-0">
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