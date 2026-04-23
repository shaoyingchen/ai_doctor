import { Fragment, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { useKBStore, type KBTreeNode } from '@/stores/kbStore'
import { API_BASE_WITH_PATH } from '@/config/api'
import type { Document } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/ui/FileUpload'
import { ParseProgress, calculateStages } from '@/components/ui/ParseProgress'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  File,
  FileText,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'

interface RagStateItem {
  docId: string
  filename?: string
  sourceUri?: string
  updatedAt?: string
  status?: 'pending' | 'parsing' | 'completed' | 'failed'
  progress?: number
  currentStage?: string
  error?: string | null
}

type SortDirection = 'asc' | 'desc' | null
type SortField = 'name' | 'size' | 'updatedAt' | 'status' | null

function getFileIcon(type: Document['type']) {
  const iconClass = 'w-5 h-5'
  switch (type) {
    case 'pdf':
      return <FileText className={cn(iconClass, 'text-red-500')} />
    case 'doc':
    case 'docx':
      return <FileText className={cn(iconClass, 'text-blue-500')} />
    case 'ppt':
    case 'pptx':
      return <FileText className={cn(iconClass, 'text-orange-500')} />
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileText className={cn(iconClass, 'text-emerald-600')} />
    case 'txt':
      return <File className={cn(iconClass, 'text-slate-500')} />
    case 'md':
      return <FileText className={cn(iconClass, 'text-purple-500')} />
    default:
      return <File className={cn(iconClass, 'text-slate-400')} />
  }
}

function getStatusBadge(status: Document['status']) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>
    case 'parsing':
      return <Badge variant="info">Processing</Badge>
    case 'parsed':
      return <Badge variant="success">Completed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function mapRagStatusToDocumentStatus(status?: string): Document['status'] {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'parsing':
      return 'parsing'
    case 'completed':
      return 'parsed'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

function findNodeById(nodes: KBTreeNode[], id: string | null): KBTreeNode | null {
  if (!id) return null
  for (const node of nodes) {
    if (node.id === id) return node
    const matched = findNodeById(node.children || [], id)
    if (matched) return matched
  }
  return null
}

function collectDescendantFolderIds(node: KBTreeNode): string[] {
  const result: string[] = []
  const stack = [...(node.children || [])]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current.type === 'folder') result.push(current.id)
    if (current.children && current.children.length > 0) {
      stack.push(...current.children)
    }
  }
  return result
}

export function FileTable() {
  const {
    files,
    selectedKBId,
    knowledgeBases,
    selectedFileIds,
    viewMode,
    searchQuery,
    toggleFileSelection,
    selectFiles,
    clearFileSelection,
    setSearchQuery,
    deleteSelectedFiles,
    setSelectedFile,
    setFiles,
    updateKnowledgeBaseCounts,
  } = useKBStore()

  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set())
  const [taskDetails, setTaskDetails] = useState<Map<string, { progress: number; currentStage: string; error?: string }>>(
    new Map()
  )

  const applyRagItems = (items: RagStateItem[]) => {
    const details = new Map<string, { progress: number; currentStage: string; error?: string }>()
    items.forEach((item) => {
      details.set(item.docId, {
        progress: item.progress ?? 0,
        currentStage: item.currentStage || 'Pending',
        error: item.error || undefined,
      })
    })
    setTaskDetails(details)

    setFiles(
      items.map((item) => ({
        id: item.docId,
        name: item.filename || 'unknown',
        type: (item.filename?.split('.').pop()?.toLowerCase() || 'unknown') as Document['type'],
        size: 0,
        knowledgeBaseId: 'kb-1',
        folderId: undefined,
        status: mapRagStatusToDocumentStatus(item.status),
        version: 'v1.0',
        tags: [],
        category: 'RAG Upload',
        createdAt: item.updatedAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        parsedAt: item.status === 'completed' ? item.updatedAt : undefined,
      }))
    )
    updateKnowledgeBaseCounts()
  }

  const fetchRagState = async () => {
    const response = await fetch(API_BASE_WITH_PATH('/api/rag/state'))
    if (!response.ok) throw new Error('Failed to fetch rag state')
    const data = await response.json()
    if (Array.isArray(data.items)) {
      applyRagItems(data.items as RagStateItem[])
    }
  }

  useEffect(() => {
    const poll = async () => {
      try {
        await fetchRagState()
      } catch {
        // ignore polling error
      }
    }
    void poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchRagState()
    } finally {
      setIsRefreshing(false)
    }
  }

  const selectedNode = useMemo(() => findNodeById(knowledgeBases, selectedKBId), [knowledgeBases, selectedKBId])

  const folderScopeIds = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'folder') return new Set<string>()
    const ids = [selectedNode.id, ...collectDescendantFolderIds(selectedNode)]
    return new Set(ids)
  }, [selectedNode])

  const filteredFiles = files.filter((file) => {
    const matchesSearch = searchQuery ? file.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    if (!matchesSearch) return false
    if (!selectedNode) return true
    if (selectedNode.type === 'kb') return file.knowledgeBaseId === selectedNode.id
    if (file.folderId) return folderScopeIds.has(file.folderId)
    return file.category === selectedNode.name
  })

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (!sortField || !sortDirection) return 0
    const multiplier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name)
      case 'size':
        return multiplier * (a.size - b.size)
      case 'updatedAt':
        return multiplier * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      case 'status':
        return multiplier * a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-green-500" />
    ) : (
      <ChevronDown className="w-3 h-3 text-green-500" />
    )
  }

  const handleRowClick = (file: Document, e: React.MouseEvent) => {
    e.stopPropagation()
    const versions =
      file.version === 'v1.0' && file.updatedAt === file.createdAt
        ? [{ version: 'v1.0', updatedAt: file.createdAt }]
        : [
            { version: file.version, updatedAt: file.updatedAt },
            { version: 'v1.0', updatedAt: file.createdAt },
          ]
    const detail = taskDetails.get(file.id)
    setSelectedFile({
      ...file,
      versions,
      parseDetails: detail
        ? {
            chunks: detail.progress > 0 ? Math.max(1, Math.round(detail.progress / 10)) : 0,
            vectors: detail.progress > 0 ? Math.max(1, Math.round(detail.progress / 10)) : 0,
            error: detail.error,
          }
        : undefined,
    })
  }

  const handleSelectAll = () => {
    if (selectedFileIds.length === sortedFiles.length) clearFileSelection()
    else selectFiles(sortedFiles.map((file) => file.id))
  }

  const hasPendingFiles = selectedFileIds.some((id) => files.find((f) => f.id === id)?.status === 'pending')

  const handleRagParseSelected = async () => {
    const pendingIds = selectedFileIds.filter((id) => files.find((f) => f.id === id)?.status === 'pending')
    if (pendingIds.length === 0) return
    try {
      await Promise.all(
        pendingIds.map((fileId) =>
          fetch(API_BASE_WITH_PATH(`/api/rag/retry/${fileId}`), {
            method: 'POST',
          })
        )
      )
      await handleRefresh()
    } catch (error) {
      console.error('RAG parse selected files failed:', error)
    }
  }

  const toggleTaskExpand = (fileId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <Button variant="default" size="sm" onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-1" />
          Upload
        </Button>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('w-4 h-4 mr-1', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>

        {selectedFileIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Selected {selectedFileIds.length}</span>
            {hasPendingFiles && viewMode === 'files' && (
              <Button variant="outline" size="sm" onClick={handleRagParseSelected}>
                <Play className="w-4 h-4 mr-1" />
                Parse
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={deleteSelectedFiles}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="w-10 px-3 py-2 text-left"></th>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedFileIds.length === sortedFiles.length && sortedFiles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-green-500 focus:ring-green-500"
                />
              </th>
              <th className="px-3 py-2 text-left">
                <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                  Name
                  {renderSortIcon('name')}
                </button>
              </th>
              <th className="px-3 py-2 text-left">
                <button onClick={() => handleSort('status')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                  Status
                  {renderSortIcon('status')}
                </button>
              </th>
              <th className="px-3 py-2 text-left"><span className="text-xs font-medium text-slate-500">Version</span></th>
              <th className="px-3 py-2 text-left">
                <button onClick={() => handleSort('size')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                  Size
                  {renderSortIcon('size')}
                </button>
              </th>
              <th className="px-3 py-2 text-left">
                <button onClick={() => handleSort('updatedAt')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                  Updated
                  {renderSortIcon('updatedAt')}
                </button>
              </th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedFiles.map((file) => {
              const detail = taskDetails.get(file.id)
              const isExpanded = expandedTaskIds.has(file.id)
              const isParsing = file.status === 'parsing' && detail
              return (
                <Fragment key={file.id}>
                  <tr
                    onClick={(e) => handleRowClick(file, e)}
                    className={cn('hover:bg-slate-50 cursor-pointer transition-colors', selectedFileIds.includes(file.id) && 'bg-green-50')}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {isParsing && (
                        <button onClick={() => toggleTaskExpand(file.id)} className="p-1 hover:bg-slate-100 rounded">
                          <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', isExpanded && 'rotate-90')} />
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedFileIds.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="rounded border-slate-300 text-green-500 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="text-sm text-slate-700 truncate max-w-xs">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{isParsing ? <Badge variant="info" className="animate-pulse">Processing</Badge> : getStatusBadge(file.status)}</td>
                    <td className="px-3 py-2"><span className="text-sm text-slate-600">{file.version}</span></td>
                    <td className="px-3 py-2"><span className="text-sm text-slate-500">{formatSize(file.size)}</span></td>
                    <td className="px-3 py-2"><span className="text-sm text-slate-500">{formatDate(file.updatedAt)}</span></td>
                    <td className="px-3 py-2">
                      <button onClick={(e) => e.stopPropagation()} className="p-1 hover:bg-slate-100 rounded">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && isParsing && detail && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-3 py-4">
                        <ParseProgress
                          stages={calculateStages(detail.progress)}
                          currentStage={detail.currentStage}
                          progress={detail.progress}
                          error={detail.error}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>

        {sortedFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mb-2" />
            <p className="text-sm">No files</p>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-500">Total {sortedFiles.length} files</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>Prev</Button>
          <span className="text-xs text-slate-500">Page 1</span>
          <Button variant="ghost" size="sm" disabled>Next</Button>
        </div>
      </div>

      {showUploadModal && (
        <FileUpload
          targetNode={selectedNode ? { id: selectedNode.id, type: selectedNode.type } : null}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            setShowUploadModal(false)
            void handleRefresh()
          }}
        />
      )}
    </div>
  )
}
