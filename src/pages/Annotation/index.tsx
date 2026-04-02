import React, { useState, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  Search,
  FileText,
  Tag,
  Building2,
  Hash,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { AnnotationStatus, AnnotationType, EntityType } from '@/stores/annotationStore'
import { useAnnotationStore } from '@/stores/annotationStore'
import type { AutoAnnotation, ManualAnnotation } from '@/types'

// Status badge component
const StatusBadge: React.FC<{ status: AnnotationStatus }> = ({ status }) => {
  const config = {
    pending: { label: '待审核', variant: 'warning', icon: Clock },
    in_progress: { label: '处理中', variant: 'info', icon: PlayCircle },
    approved: { label: '已通过', variant: 'success', icon: CheckCircle2 },
    rejected: { label: '已驳回', variant: 'destructive', icon: XCircle },
  }
  const { label, variant, icon: Icon } = config[status]
  return (
    <Badge variant={variant as any} className="gap-1">
      <Icon size={12} />
      {label}
    </Badge>
  )
}

// Confidence indicator
const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
  const percentage = Math.round(confidence * 100)
  const color = percentage >= 90 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-slate-500">{percentage}%</span>
    </div>
  )
}

// Entity type badge
const EntityTypeBadge: React.FC<{ type: EntityType }> = ({ type }) => {
  const config = {
    region: { label: '地区', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    time: { label: '时间', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    number: { label: '数值', color: 'bg-green-100 text-green-700 border-green-300' },
    organization: { label: '组织', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  }
  const { label, color } = config[type]
  return (
    <span className={cn('px-1.5 py-0.5 rounded-xs text-xs border', color)}>
      {label}
    </span>
  )
}

// Task Queue Panel (Left Column)
const TaskQueuePanel: React.FC = () => {
  const {
    filteredTasks,
    selectedTaskId,
    stats,
    statusFilter,
    searchQuery,
    setStatusFilter,
    setSearchQuery,
    selectTask,
    batchApprove,
    batchReject,
  } = useAnnotationStore()

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleBatchApprove = () => {
    if (selectedIds.length > 0) {
      batchApprove(selectedIds)
      setSelectedIds([])
    }
  }

  const handleBatchReject = () => {
    if (selectedIds.length > 0) {
      batchReject(selectedIds)
      setSelectedIds([])
    }
  }

  const statusButtons: { status: AnnotationStatus | 'all'; label: string; count: number; color: string }[] = [
    { status: 'all', label: '全部', count: stats.pending + stats.inProgress + stats.approved + stats.rejected, color: 'text-slate-600' },
    { status: 'pending', label: '待审核', count: stats.pending, color: 'text-yellow-600' },
    { status: 'in_progress', label: '处理中', count: stats.inProgress, color: 'text-blue-600' },
    { status: 'approved', label: '已通过', count: stats.approved, color: 'text-green-600' },
    { status: 'rejected', label: '已驳回', count: stats.rejected, color: 'text-red-600' },
  ]

  return (
    <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          标注任务队列
        </h2>
      </div>

      {/* Status Stats */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="flex gap-1 flex-wrap">
          {statusButtons.map(({ status, label, count, color }) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-2 py-1 rounded-sm text-xs font-medium transition-all',
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 hover:bg-slate-200'
              )}
            >
              {label} <span className={cn(statusFilter === status ? 'text-white' : color)}>({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <Input
          placeholder="搜索文档..."
          icon={<Search size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p>暂无任务</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => selectTask(task.id)}
                className={cn(
                  'p-3 rounded-lg cursor-pointer transition-all border',
                  selectedTaskId === task.id
                    ? 'bg-primary-50 border-primary shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                )}
              >
                <div className="flex items-start gap-2">
                  {(task.status === 'pending' || task.status === 'in_progress') && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(task.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        setSelectedIds(
                          e.target.checked
                            ? [...selectedIds, task.id]
                            : selectedIds.filter(id => id !== task.id)
                        )
                      }}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {task.documentName}
                      </span>
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{task.autoAnnotations.length} 个自动标注</span>
                      <span>{task.manualAnnotations.length} 个人工标注</span>
                    </div>
                    {task.status === 'approved' || task.status === 'rejected' ? (
                      <div className="mt-1 text-xs text-slate-400">
                        审核人: {task.reviewer || '未知'}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Operations */}
      {selectedIds.length > 0 && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">已选 {selectedIds.length} 项</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBatchReject}>
                <XCircle size={14} className="mr-1" />
                批量驳回
              </Button>
              <Button size="sm" onClick={handleBatchApprove}>
                <CheckCircle2 size={14} className="mr-1" />
                批量通过
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Annotation Editor Panel (Middle Column)
const AnnotationEditorPanel: React.FC = () => {
  const {
    currentDocument,
    selectedTaskId,
    tasks,
    showAutoAnnotations,
    toggleShowAutoAnnotations,
  } = useAnnotationStore()

  const task = tasks.find(t => t.id === selectedTaskId)

  // Render document content with highlights
  const renderContent = useMemo(() => {
    if (!currentDocument) return null

    const content = currentDocument.content
    const highlights = showAutoAnnotations ? currentDocument.highlights : []

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start)

    // Build segments
    const segments: { text: string; highlight?: typeof highlights[0] }[] = []
    let pos = 0

    for (const h of sortedHighlights) {
      if (h.start > pos) {
        segments.push({ text: content.slice(pos, h.start) })
      }
      if (h.end > h.start) {
        segments.push({ text: content.slice(h.start, h.end), highlight: h })
      }
      pos = Math.max(pos, h.end)
    }
    if (pos < content.length) {
      segments.push({ text: content.slice(pos) })
    }

    return segments.map((seg, i) => {
      if (seg.highlight) {
        return (
          <span
            key={i}
            className="bg-opacity-20 rounded px-0.5 cursor-pointer hover:bg-opacity-30 transition-all"
            style={{ backgroundColor: seg.highlight.color }}
          >
            {seg.text}
          </span>
        )
      }
      return <span key={i}>{seg.text}</span>
    })
  }, [currentDocument, showAutoAnnotations])

  if (!currentDocument || !task) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-slate-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>请从左侧选择一个标注任务</p>
          <p className="text-sm mt-1">点击任务开始编辑标注</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">{task.documentName}</span>
          <StatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleShowAutoAnnotations}
            className="gap-1"
          >
            {showAutoAnnotations ? <Eye size={16} /> : <EyeOff size={16} />}
            {showAutoAnnotations ? '显示标注' : '隐藏标注'}
          </Button>
        </div>
      </div>

      {/* Document Preview */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="prose prose-slate text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {renderContent}
          </div>
        </div>
      </div>
    </div>
  )
}

// Result Panel (Right Column)
const ResultPanel: React.FC = () => {
  const {
    selectedTaskId,
    tasks,
    autoAnnotations,
    manualAnnotations,
    activeAnnotationType,
    showAutoAnnotations,
    entityTypes,
    setActiveAnnotationType,
    addManualAnnotation,
    removeManualAnnotation,
    approveTask,
    rejectTask,
    resetAnnotations,
  } = useAnnotationStore()

  const [newCategory, setNewCategory] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newEntity, setNewEntity] = useState('')
  const [newEntityType, setNewEntityType] = useState<EntityType>('region')

  const task = tasks.find(t => t.id === selectedTaskId)

  // Group auto annotations by type
  const groupedAutoAnnotations = useMemo(() => {
    const groups: Record<AnnotationType, AutoAnnotation[]> = {
      category: [],
      entity: [],
      keyword: [],
    }
    if (showAutoAnnotations && autoAnnotations) {
      for (const a of autoAnnotations) {
        groups[a.type].push(a)
      }
    }
    return groups
  }, [autoAnnotations, showAutoAnnotations])

  // Group manual annotations by type
  const groupedManualAnnotations = useMemo(() => {
    const groups: Record<AnnotationType, ManualAnnotation[]> = {
      category: [],
      entity: [],
      keyword: [],
    }
    for (const a of manualAnnotations) {
      groups[a.type].push(a)
    }
    return groups
  }, [manualAnnotations])

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addManualAnnotation({ type: 'category', value: newCategory.trim() })
      setNewCategory('')
    }
  }

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      addManualAnnotation({ type: 'keyword', value: newKeyword.trim() })
      setNewKeyword('')
    }
  }

  const handleAddEntity = () => {
    if (newEntity.trim()) {
      addManualAnnotation({ type: 'entity', value: `${newEntityType}:${newEntity.trim()}` })
      setNewEntity('')
    }
  }

  if (!selectedTaskId || !task) {
    return (
      <div className="w-72 border-l border-slate-200 bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-400 p-4">
          <ChevronRight size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">选择任务后显示标注结果</p>
        </div>
      </div>
    )
  }

  const canApprove = task.status === 'pending' || task.status === 'in_progress'

  return (
    <div className="w-72 border-l border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Tag size={18} className="text-primary" />
          标注结果
        </h2>
      </div>

      {/* Tabs for annotation types */}
      <Tabs value={activeAnnotationType} onValueChange={(v) => setActiveAnnotationType(v as AnnotationType)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-3 pt-3 bg-white border-b border-slate-200 justify-start">
          <TabsTrigger value="category" className="text-xs">
            <Tag size={14} className="mr-1" />
            分类
          </TabsTrigger>
          <TabsTrigger value="entity" className="text-xs">
            <Building2 size={14} className="mr-1" />
            实体
          </TabsTrigger>
          <TabsTrigger value="keyword" className="text-xs">
            <Hash size={14} className="mr-1" />
            关键词
          </TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="flex-1 overflow-y-auto p-3 m-0">
          {/* Auto annotations */}
          {showAutoAnnotations && groupedAutoAnnotations.category.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-500 mb-2">自动分类</div>
              <div className="space-y-2">
                {groupedAutoAnnotations.category.map((a, i) => (
                  <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{a.value}</span>
                      <ConfidenceBar confidence={a.confidence} />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-6 text-xs w-full"
                      onClick={() => addManualAnnotation({ type: 'category', value: a.value })}
                    >
                      <Plus size={12} className="mr-1" />
                      添加到人工标注
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual annotations */}
          <div className="mb-3">
            <div className="text-xs font-medium text-slate-500 mb-2">人工分类</div>
            <div className="space-y-2">
              {groupedManualAnnotations.category.map((a, i) => (
                <div key={i} className="bg-primary-50 border border-primary-200 rounded-md p-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{a.value}</span>
                  <button
                    onClick={() => removeManualAnnotation(manualAnnotations.findIndex(m => m.type === 'category' && m.value === a.value))}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add new */}
          <div className="space-y-2">
            <Input
              placeholder="输入分类名称..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-8"
            />
            <Button size="sm" className="w-full" onClick={handleAddCategory}>
              <Plus size={14} className="mr-1" />
              添加分类
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="entity" className="flex-1 overflow-y-auto p-3 m-0">
          {/* Entity type selector */}
          <div className="mb-3 flex gap-1 flex-wrap">
            {entityTypes.map((et) => (
              <button
                key={et.id}
                onClick={() => setNewEntityType(et.id)}
                className={cn(
                  'px-2 py-1 rounded-xs text-xs border transition-all',
                  newEntityType === et.id
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {et.label}
              </button>
            ))}
          </div>

          {/* Auto annotations */}
          {showAutoAnnotations && groupedAutoAnnotations.entity.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-500 mb-2">自动实体</div>
              <div className="space-y-2">
                {groupedAutoAnnotations.entity.map((a, i) => {
                  const entityType = a.location as EntityType
                  return (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <EntityTypeBadge type={entityType} />
                        <span className="text-sm font-medium text-slate-700">{a.value}</span>
                      </div>
                      <ConfidenceBar confidence={a.confidence} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-6 text-xs w-full"
                        onClick={() => addManualAnnotation({ type: 'entity', value: `${entityType}:${a.value}` })}
                      >
                        <Plus size={12} className="mr-1" />
                        添加到人工标注
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual annotations */}
          <div className="mb-3">
            <div className="text-xs font-medium text-slate-500 mb-2">人工实体</div>
            <div className="space-y-2">
              {groupedManualAnnotations.entity.map((a, i) => {
                const [type, value] = a.value.split(':')
                return (
                  <div key={i} className="bg-primary-50 border border-primary-200 rounded-md p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EntityTypeBadge type={type as EntityType} />
                      <span className="text-sm font-medium text-slate-700">{value}</span>
                    </div>
                    <button
                      onClick={() => removeManualAnnotation(manualAnnotations.findIndex(m => m.type === 'entity' && m.value === a.value))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add new */}
          <div className="space-y-2">
            <Input
              placeholder="输入实体值..."
              value={newEntity}
              onChange={(e) => setNewEntity(e.target.value)}
              className="h-8"
            />
            <Button size="sm" className="w-full" onClick={handleAddEntity}>
              <Plus size={14} className="mr-1" />
              添加实体
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="keyword" className="flex-1 overflow-y-auto p-3 m-0">
          {/* Auto annotations */}
          {showAutoAnnotations && groupedAutoAnnotations.keyword.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-500 mb-2">自动关键词</div>
              <div className="flex flex-wrap gap-1">
                {groupedAutoAnnotations.keyword.map((a, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary-50"
                    onClick={() => addManualAnnotation({ type: 'keyword', value: a.value })}
                  >
                    {a.value}
                    <span className="ml-1 text-xs opacity-60">{Math.round(a.confidence * 100)}%</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Manual annotations */}
          <div className="mb-3">
            <div className="text-xs font-medium text-slate-500 mb-2">人工关键词</div>
            <div className="flex flex-wrap gap-1">
              {groupedManualAnnotations.keyword.map((a, i) => (
                <Badge
                  key={i}
                  variant="outlinePrimary"
                  className="gap-1"
                >
                  {a.value}
                  <button
                    onClick={() => removeManualAnnotation(manualAnnotations.findIndex(m => m.type === 'keyword' && m.value === a.value))}
                    className="hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Add new */}
          <div className="space-y-2">
            <Input
              placeholder="输入关键词..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="h-8"
            />
            <Button size="sm" className="w-full" onClick={handleAddKeyword}>
              <Plus size={14} className="mr-1" />
              添加关键词
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Actions */}
      {canApprove && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={resetAnnotations}
            >
              <RefreshCw size={14} className="mr-1" />
              重置
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => rejectTask(selectedTaskId)}
            >
              <XCircle size={14} className="mr-1" />
              驳回
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => approveTask(selectedTaskId)}
            >
              <CheckCircle2 size={14} className="mr-1" />
              通过
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Main Annotation Workbench Page
const AnnotationWorkbench: React.FC = () => {
  return (
    <div className="h-full flex bg-slate-50">
      <TaskQueuePanel />
      <AnnotationEditorPanel />
      <ResultPanel />
    </div>
  )
}

export default AnnotationWorkbench