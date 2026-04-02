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
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }

  const iconBgClasses = {
    yellow: 'bg-yellow-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    red: 'bg-red-100',
  }

  return (
    <Card className={cn('transition-all hover:shadow-md', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold mt-1">{count}</p>
          </div>
          <div className={cn('p-3 rounded-lg', iconBgClasses[color])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
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
  return (
    <div className="flex items-center">
      <div
        className={cn(
          'flex flex-col items-center',
        )}
      >
        <div
          className={cn(
            'w-16 h-16 rounded-xl flex items-center justify-center text-lg font-semibold transition-all',
            isCompleted && 'bg-primary text-white shadow-lg shadow-primary/30',
            isActive && 'bg-primary-100 text-primary border-2 border-primary animate-pulse',
            !isCompleted && !isActive && 'bg-slate-100 text-slate-400 border-2 border-slate-200'
          )}
        >
          {index + 1}
        </div>
        <span
          className={cn(
            'mt-2 text-sm font-medium',
            isCompleted && 'text-primary',
            isActive && 'text-primary',
            !isCompleted && !isActive && 'text-slate-400'
          )}
        >
          {stage.name}
        </span>
        <span className="text-xs text-slate-400">{stage.nameEn}</span>
      </div>
      {index < PIPELINE_STAGES.length - 1 && (
        <div
          className={cn(
            'w-12 h-1 mx-2 rounded',
            isCompleted ? 'bg-primary' : 'bg-slate-200'
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
  color,
}: {
  label: string
  value: number
  color: 'green' | 'blue' | 'purple'
}) {
  const colorClasses = {
    green: 'bg-primary',
    blue: 'bg-accent-blue',
    purple: 'bg-accent-purple',
  }

  const bgColorClasses = {
    green: 'bg-primary-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className={cn('h-2 rounded-full', bgColorClasses[color])}>
        <div
          className={cn('h-full rounded-full transition-all', colorClasses[color])}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

// Task progress bar component
function TaskProgressBar({ stages }: { stages: ParseStage[] }) {
  return (
    <div className="flex items-center gap-1 mt-2">
      {stages.map((stage, index) => (
        <div
          key={stage.name}
          className="flex-1 flex items-center"
        >
          <div
            className={cn(
              'h-2 flex-1 rounded-full transition-all',
              stage.status === 'completed' && 'bg-primary',
              stage.status === 'processing' && 'bg-primary-200',
              stage.status === 'failed' && 'bg-accent-red',
              stage.status === 'pending' && 'bg-slate-200'
            )}
            style={{
              width: '100%',
            }}
          />
          {index < stages.length - 1 && (
            <div
              className={cn(
                'w-1 h-1 rounded-full mx-0.5',
                stage.status === 'completed' ? 'bg-primary' : 'bg-slate-300'
              )}
            />
          )}
        </div>
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
    <Card hover className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-slate-800 truncate">{task.documentName}</h4>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{task.currentStage}</p>
            <TaskProgressBar stages={stages} />
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span>进度: {task.progress}%</span>
              <span>创建: {new Date(task.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {task.error && (
              <div className="mt-2 p-2 bg-red-50 rounded-md text-sm text-red-600">
                {task.error}
              </div>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            {task.status === 'failed' && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                重试
              </Button>
            )}
            {(task.status === 'pending' || task.status === 'uploading') && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                取消
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">解析配置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">解析引擎</label>
          <select
            value={parseEngine}
            onChange={(e) => setParseEngine(e.target.value as typeof parseEngine)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="mineru">MinerU</option>
            <option value="pymupdf">PyMuPDF</option>
            <option value="paddle-ocr">Paddle-OCR</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">分块策略</label>
          <select
            value={chunkStrategy}
            onChange={(e) => setChunkStrategy(e.target.value as typeof chunkStrategy)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="smart">智能分块</option>
            <option value="fixed">固定大小</option>
            <option value="paragraph">段落分块</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">向量化模型</label>
          <select
            value={vectorModel}
            onChange={(e) => setVectorModel(e.target.value as typeof vectorModel)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="bge-large">BGE-large</option>
            <option value="text-embedding">text-embedding</option>
            <option value="custom">自定义</option>
          </select>
        </div>
      </CardContent>
    </Card>
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
  } = usePipelineStore()

  const filteredTasks = getFilteredTasks()

  // Calculate the current active stage index based on processing tasks
  const activeStageIndex = Math.max(
    ...tasks
      .filter((t) => t.status !== 'pending' && t.status !== 'completed' && t.status !== 'failed')
      .map((t) => Math.floor(t.progress / 20)),
    0
  )

  // Icons
  const PendingIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  const ProcessingIcon = () => (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )

  const CompletedIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )

  const FailedIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50">
      {/* Top status cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatusCard
          title="待处理"
          count={statusCounts.pending}
          icon={<PendingIcon />}
          color="yellow"
        />
        <StatusCard
          title="处理中"
          count={statusCounts.processing}
          icon={<ProcessingIcon />}
          color="blue"
        />
        <StatusCard
          title="已完成"
          count={statusCounts.completed}
          icon={<CompletedIcon />}
          color="green"
        />
        <StatusCard
          title="失败"
          count={statusCounts.failed}
          icon={<FailedIcon />}
          color="red"
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        {/* Left: Flow diagram */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>处理流程</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Flow diagram */}
            <div className="flex justify-center py-4">
              <div className="flex items-center">
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
            </div>

            {/* Current processing document */}
            {currentProcessingDocument && (
              <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                <p className="text-sm text-primary-700">
                  当前处理: <span className="font-medium">{currentProcessingDocument}</span>
                </p>
              </div>
            )}

            {/* Resource monitoring */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700">资源监控</h4>
              <ResourceMonitor label="CPU" value={resourceUsage.cpu} color="green" />
              <ResourceMonitor label="内存" value={resourceUsage.memory} color="blue" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">队列长度</span>
                <span className="font-medium">{resourceUsage.queueLength} 个任务</span>
              </div>
            </div>

            {/* Configuration */}
            <ConfigPanel />
          </CardContent>
        </Card>

        {/* Right: Task list */}
        <Card className="col-span-2 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle>任务列表</CardTitle>
              <div className="flex gap-2">
                {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={statusFilter === filter ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter(filter)}
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
          <CardContent className="flex-1 overflow-auto min-h-0">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>暂无任务</p>
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