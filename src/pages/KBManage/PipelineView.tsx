import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/badge'
import { calculateStages } from '@/components/ui/ParseProgress'
import type { ParseTask } from '@/types'
import {
  FileText,
  Clock,
  CheckCircle2,
  RefreshCw,
  Upload,
  Layers,
  Database,
  AlertCircle,
  Cpu,
} from 'lucide-react'

interface PipelineViewProps {
  documentId?: string
}

// Info row component
function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon?: any
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  )
}

// Stage detail card
function StageCard({
  stage,
  index,
  isActive,
  isCompleted,
  isFailed,
}: {
  stage: { name: string; status: string; progress: number }
  index: number
  isActive: boolean
  isCompleted: boolean
  isFailed: boolean
}) {
  const stageIcons = [Upload, FileText, Layers, Database, CheckCircle2]
  const StageIcon = stageIcons[index]

  return (
    <div
      className={cn(
        'border rounded-lg p-3 transition-all',
        isCompleted && 'border-primary/30 bg-primary-50/30',
        isActive && 'border-primary bg-primary-50/50 animate-pulse',
        isFailed && 'border-red-200 bg-red-50',
        !isCompleted && !isActive && !isFailed && 'border-slate-200 bg-slate-50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isCompleted && 'bg-primary text-white',
            isActive && 'bg-primary/20 text-primary',
            isFailed && 'bg-red-100 text-red-500',
            !isCompleted && !isActive && !isFailed && 'bg-slate-200 text-slate-400'
          )}
        >
          <StageIcon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-xs font-medium',
                isCompleted && 'text-primary',
                isActive && 'text-primary',
                isFailed && 'text-red-600',
                !isCompleted && !isActive && !isFailed && 'text-slate-500'
              )}
            >
              {stage.name}
            </span>
            <span className="text-xs text-slate-400">{stage.progress}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isCompleted && 'bg-primary',
            isActive && 'bg-primary/60',
            isFailed && 'bg-red-500',
            !isCompleted && !isActive && !isFailed && 'bg-slate-300'
          )}
          style={{ width: `${Math.min(stage.progress, 100)}%` }}
        />
      </div>

      {/* Status text */}
      {isActive && (
        <p className="text-[10px] text-primary mt-1">处理中...</p>
      )}
      {isFailed && (
        <p className="text-[10px] text-red-600 mt-1">处理失败</p>
      )}
    </div>
  )
}

export function PipelineView({ documentId }: PipelineViewProps) {
  const [task, setTask] = useState<ParseTask | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch task details
  const fetchTask = async () => {
    if (!documentId) {
      setTask(null)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      const foundTask = (data.tasks || []).find((t: ParseTask) => t.documentId === documentId)
      setTask(foundTask || null)
    } catch (error) {
      console.log('Pipeline view: fetch error', error)
      setTask(null)
    } finally {
      setLoading(false)
    }
  }

  // Retry task
  const handleRetry = async () => {
    if (!task) return
    try {
      await fetch(`http://localhost:8000/api/tasks/${task.id}/retry`, {
        method: 'POST',
      })
      fetchTask()
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }

  // Poll for updates every 2 seconds
  useEffect(() => {
    fetchTask()
    const interval = setInterval(fetchTask, 2000)
    return () => clearInterval(interval)
  }, [documentId])

  const stages = task ? calculateStages(task.progress) : []

  // Determine current active stage
  const activeStageIndex = task && task.status !== 'pending' && task.status !== 'completed' && task.status !== 'failed'
    ? Math.floor(task.progress / 20)
    : -1

  if (!documentId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">暂无选中文件</p>
        <p className="text-xs text-slate-400 mt-1 text-center">
          在文件库中选择一个文件<br />查看其解析流水线详情
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
          <span className="text-sm">加载解析详情...</span>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">未找到解析任务</p>
        <p className="text-xs text-slate-400 mt-1 text-center">
          该文件可能尚未开始解析<br />或解析任务已被删除
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-auto">
      {/* Document info header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <FileText className={cn(
            'w-6 h-6 shrink-0 mt-0.5',
            task.status === 'completed' ? 'text-primary' :
            task.status === 'failed' ? 'text-red-500' : 'text-slate-400'
          )} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-800 truncate">
              {task.documentName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  task.status === 'completed' ? 'success' :
                  task.status === 'failed' ? 'destructive' :
                  task.status === 'pending' ? 'secondary' : 'info'
                }
              >
                {task.status === 'completed' ? '解析完成' :
                 task.status === 'failed' ? '解析失败' :
                 task.status === 'pending' ? '待处理' : '解析中'}
              </Badge>
              <span className="text-xs text-slate-500">{task.progress}%</span>
            </div>
          </div>
        </div>

        {task.error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-700">错误信息</p>
                <p className="text-xs text-red-600 mt-0.5">{task.error}</p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="mt-2 text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              重试解析
            </button>
          </div>
        )}
      </div>

      {/* Pipeline stages */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          解析流程
        </h3>
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <StageCard
              key={stage.name}
              stage={stage}
              index={index}
              isActive={index === activeStageIndex}
              isCompleted={index < activeStageIndex}
              isFailed={task?.status === 'failed' && index === activeStageIndex}
            />
          ))}
        </div>
      </div>

      {/* Task details */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          任务详情
        </h3>
        <div className="space-y-2">
          <InfoRow
            label="任务 ID"
            value={task.id.slice(0, 8) + '...' + task.id.slice(-4)}
            icon={Clock}
          />
          <InfoRow
            label="创建时间"
            value={new Date(task.createdAt).toLocaleString('zh-CN')}
            icon={Clock}
          />
          {task.startedAt && (
            <InfoRow
              label="开始时间"
              value={new Date(task.startedAt).toLocaleString('zh-CN')}
              icon={Clock}
            />
          )}
          {task.completedAt && (
            <InfoRow
              label="完成时间"
              value={new Date(task.completedAt).toLocaleString('zh-CN')}
              icon={CheckCircle2}
            />
          )}
        </div>
      </div>

      {/* Current stage description */}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Cpu className="w-4 h-4" />
          <span>当前阶段：<span className="font-medium text-slate-700">{task.currentStage}</span></span>
        </div>
      </div>
    </div>
  )
}
