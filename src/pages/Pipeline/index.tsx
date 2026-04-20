import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import {
  usePipelineStore,
  PIPELINE_STAGES,
  type PipelineStage,
} from '@/stores/pipelineStore'
import type { ParseTask, ParseStage } from '@/types'
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  Layers,
  Database,
  Cpu,
  MemoryStick,
  RefreshCw,
  ChevronRight
} from 'lucide-react'

// Status card component
function StatusCard({
  title,
  count,
  icon,
  color,
}: {
  title: string
  count: number
  icon: React.ReactNode
  color: 'yellow' | 'blue' | 'green' | 'red'
}) {
  const colorClasses = {
    yellow: 'border-yellow-200 bg-yellow-50',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-primary-200 bg-primary-50',
    red: 'border-red-200 bg-red-50',
  }

  const iconColorClasses = {
    yellow: 'text-yellow-600 bg-yellow-100',
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-primary bg-primary-100',
    red: 'text-red-600 bg-red-100',
  }

  const textColorClasses = {
    yellow: 'text-yellow-700',
    blue: 'text-blue-700',
    green: 'text-primary',
    red: 'text-red-700',
  }

  return (
    <div className={cn('border rounded-xl p-4 transition-all hover:shadow-sm', colorClasses[color])}>
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconColorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className={cn('text-2xl font-bold', textColorClasses[color])}>{count}</p>
        </div>
      </div>
    </div>
  )
}

// Flow diagram node component
function FlowNode({
  stage,
  index,
  isActive,
  isCompleted,
}: {
  stage: PipelineStage
  index: number
  isActive: boolean
  isCompleted: boolean
}) {
  const stageIcons = [Upload, FileText, Layers, Database, CheckCircle2]
  const StageIcon = stageIcons[index]

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
            isCompleted && 'bg-primary text-white shadow-md',
            isActive && 'bg-primary/10 text-primary border-2 border-primary',
            !isCompleted && !isActive && 'bg-slate-100 text-slate-400 border border-slate-200'
          )}
        >
          <StageIcon className="w-5 h-5" />
        </div>
        <span
          className={cn(
            'mt-2 text-xs font-medium',
            (isCompleted || isActive) && 'text-primary',
            !isCompleted && !isActive && 'text-slate-400'
          )}
        >
          {stage.name}
        </span>
      </div>
      {index < PIPELINE_STAGES.length - 1 && (
        <ChevronRight
          className={cn(
            'w-5 h-5 mx-1',
            isCompleted ? 'text-primary' : 'text-slate-300'
          )}
        />
      )}
    </div>
  )
}

// Resource monitor component
function ResourceMonitor({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-500">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">{label}</span>
          <span className="font-medium text-slate-700">{value}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Task progress bar component
function TaskProgressBar({ stages }: { stages: ParseStage[] }) {
  return (
    <div className="flex items-center gap-0.5 mt-2">
      {stages.map((stage) => (
        <div
          key={stage.name}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all',
            stage.status === 'completed' && 'bg-primary',
            stage.status === 'processing' && 'bg-primary/50',
            stage.status === 'failed' && 'bg-red-500',
            stage.status === 'pending' && 'bg-slate-200'
          )}
        />
      ))}
    </div>
  )
}

// Task card component
function TaskCard({
  task,
  stages,
  onRetry,
  onCancel,
}: {
  task: ParseTask
  stages: ParseStage[]
  onRetry: () => void
  onCancel: () => void
}) {
  const statusConfig: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'destructive' | 'secondary' }> = {
    pending: { label: '待处理', variant: 'secondary' },
    uploading: { label: '上传中', variant: 'info' },
    parsing: { label: '解析中', variant: 'info' },
    chunking: { label: '分块中', variant: 'info' },
    vectorizing: { label: '向量化', variant: 'info' },
    completed: { label: '已完成', variant: 'success' },
    failed: { label: '失败', variant: 'destructive' },
  }

  const config = statusConfig[task.status] || { label: task.status, variant: 'secondary' }

  return (
    <div className="border border-slate-100 rounded-xl p-4 mb-2 hover:border-slate-200 hover:shadow-sm transition-all bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-slate-400" />
            <h4 className="text-sm font-medium text-slate-800 truncate">{task.documentName}</h4>
            <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
          </div>
          <p className="text-xs text-slate-500 mb-1">{task.currentStage}</p>
          <TaskProgressBar stages={stages} />
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span>进度 {task.progress}%</span>
            <span>{new Date(task.createdAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {task.error && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600">
              {task.error}
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {task.status === 'failed' && (
            <Button variant="outline" size="sm" onClick={onRetry} className="text-xs h-7">
              <RefreshCw className="w-3 h-3 mr-1" />
              重试
            </Button>
          )}
          {(task.status === 'pending' || task.status === 'uploading') && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7">
              取消
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Configuration panel
function ConfigPanel() {
  const {
    parseEngine,
    chunkStrategy,
    vectorModel,
    setParseEngine,
    setChunkStrategy,
    setVectorModel,
  } = usePipelineStore()

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">解析引擎</label>
        <select
          value={parseEngine}
          onChange={(e) => setParseEngine(e.target.value as typeof parseEngine)}
          className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="mineru">MinerU</option>
          <option value="pymupdf">PyMuPDF</option>
          <option value="paddle-ocr">Paddle-OCR</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">分块策略</label>
        <select
          value={chunkStrategy}
          onChange={(e) => setChunkStrategy(e.target.value as typeof chunkStrategy)}
          className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="smart">智能分块</option>
          <option value="fixed">固定大小</option>
          <option value="paragraph">段落分块</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">向量化模型</label>
        <select
          value={vectorModel}
          onChange={(e) => setVectorModel(e.target.value as typeof vectorModel)}
          className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="bge-large">BGE-large</option>
          <option value="text-embedding">text-embedding</option>
          <option value="custom">自定义</option>
        </select>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const {
    tasks,
    statusCounts,
    currentProcessingDocument,
    resourceUsage,
    statusFilter,
    setStatusFilter,
    retryTask,
    cancelTask,
    getFilteredTasks,
    calculateProgress,
    fetchTasks,
  } = usePipelineStore()

  const filteredTasks = getFilteredTasks()

  // Poll for task progress every 2 seconds
  useEffect(() => {
    // Initial fetch
    fetchTasks()

    // Poll every 2 seconds
    const interval = setInterval(fetchTasks, 2000)

    return () => clearInterval(interval)
  }, [])

  // Calculate the current active stage index based on processing tasks
  const activeStageIndex = Math.max(
    ...tasks
      .filter((t) => t.status !== 'pending' && t.status !== 'completed' && t.status !== 'failed')
      .map((t) => Math.floor(t.progress / 20)),
    0
  )

  return (
    <div className="h-full flex flex-col p-4 gap-4 bg-white">
      {/* Top status cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatusCard
          title="待处理"
          count={statusCounts.pending}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <StatusCard
          title="处理中"
          count={statusCounts.processing}
          icon={<Loader2 className="w-5 h-5 animate-spin" />}
          color="blue"
        />
        <StatusCard
          title="已完成"
          count={statusCounts.completed}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
        <StatusCard
          title="失败"
          count={statusCounts.failed}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {/* Left: Flow diagram */}
        <Card className="col-span-1 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">处理流程</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Flow diagram */}
            <div className="flex justify-center py-2 px-1">
              {PIPELINE_STAGES.map((stage, index) => (
                <FlowNode
                  key={stage.id}
                  stage={stage}
                  index={index}
                  isActive={index === activeStageIndex}
                  isCompleted={index < activeStageIndex}
                />
              ))}
            </div>

            {/* Current processing document */}
            {currentProcessingDocument && (
              <div className="p-2 bg-primary-50 rounded-lg border border-primary-100">
                <p className="text-xs text-primary-700">
                  当前处理: <span className="font-medium">{currentProcessingDocument}</span>
                </p>
              </div>
            )}

            {/* Resource monitoring */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">资源监控</h4>
              <ResourceMonitor label="CPU" value={resourceUsage.cpu} icon={<Cpu className="w-4 h-4" />} />
              <ResourceMonitor label="内存" value={resourceUsage.memory} icon={<MemoryStick className="w-4 h-4" />} />
              <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">队列长度</span>
                <span className="font-medium text-slate-700">{resourceUsage.queueLength} 个任务</span>
              </div>
            </div>

            {/* Configuration */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">解析配置</h4>
              <ConfigPanel />
            </div>
          </CardContent>
        </Card>

        {/* Right: Task list */}
        <Card className="col-span-2 flex flex-col min-h-0 border-slate-200">
          <CardHeader className="flex-shrink-0 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">任务列表</CardTitle>
              <div className="flex gap-1">
                {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={statusFilter === filter ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter(filter)}
                    className="text-xs h-7"
                  >
                    {filter === 'all' && '全部'}
                    {filter === 'pending' && '待处理'}
                    {filter === 'processing' && '处理中'}
                    {filter === 'completed' && '已完成'}
                    {filter === 'failed' && '失败'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto min-h-0 p-3 pt-0">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FileText className="w-12 h-12 mb-3 stroke-1" />
                <p className="text-sm">暂无任务</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    stages={calculateProgress(task)}
                    onRetry={() => retryTask(task.id)}
                    onCancel={() => cancelTask(task.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}