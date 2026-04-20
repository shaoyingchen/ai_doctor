import { cn } from '@/lib/cn'
import { PIPELINE_STAGES } from '@/stores/pipelineStore'
import { Upload, FileText, Layers, Database, CheckCircle2 } from 'lucide-react'

interface ParseStage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
}

interface ParseProgressProps {
  stages: ParseStage[]
  currentStage: string
  progress: number
  error?: string
}

const stageIcons = [Upload, FileText, Layers, Database, CheckCircle2]

export function ParseProgress({ stages, currentStage, progress, error }: ParseProgressProps) {
  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            error ? 'bg-red-500' : 'bg-primary'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="flex items-center justify-between gap-1">
        {stages.map((stage, index) => {
          const Icon = stageIcons[index]
          return (
            <div
              key={stage.name}
              className="flex flex-col items-center gap-1 flex-1"
              title={`${stage.name}: ${stage.status}`}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                  stage.status === 'completed' && 'bg-primary text-white',
                  stage.status === 'processing' && 'bg-primary/20 text-primary animate-pulse',
                  stage.status === 'failed' && 'bg-red-100 text-red-500',
                  stage.status === 'pending' && 'bg-slate-100 text-slate-300'
                )}
              >
                <Icon className="w-3 h-3" />
              </div>
              <span
                className={cn(
                  'text-[10px] truncate max-w-[60px]',
                  stage.status === 'completed' && 'text-primary',
                  stage.status === 'processing' && 'text-primary font-medium',
                  stage.status === 'failed' && 'text-red-500',
                  stage.status === 'pending' && 'text-slate-400'
                )}
              >
                {stage.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* Current stage text */}
      <div className="text-center">
        <p className={cn(
          'text-xs',
          error ? 'text-red-500' : 'text-slate-500'
        )}>
          {error || `当前阶段：${currentStage}`}
        </p>
      </div>
    </div>
  )
}

// Calculate stages from progress
export function calculateStages(progress: number): ParseStage[] {
  return PIPELINE_STAGES.map((stage, index) => {
    const stageProgress = (index + 1) * 20
    let status: ParseStage['status'] = 'pending'
    let stageProg = 0

    if (progress > stageProgress) {
      status = 'completed'
      stageProg = 100
    } else if (progress > index * 20) {
      status = 'processing'
      stageProg = ((progress - index * 20) / 20) * 100
    }

    return {
      name: stage.name,
      status,
      progress: Math.round(stageProg),
    }
  })
}
