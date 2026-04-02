import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useKBStore } from '@/stores/kbStore'
import type { Document } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  File,
  Trash2,
  Play,
  Search,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Upload,
} from 'lucide-react'

// Get file type icon
function getFileIcon(type: Document['type']) {
  const iconClass = 'w-5 h-5'
  switch (type) {
    case 'pdf':
      return <FileText className={cn(iconClass, 'text-red-500')} />
    case 'doc':
    case 'docx':
      return <FileText className={cn(iconClass, 'text-blue-500')} />
    case 'txt':
      return <File className={cn(iconClass, 'text-slate-500')} />
    case 'md':
      return <FileText className={cn(iconClass, 'text-purple-500')} />
    default:
      return <File className={cn(iconClass, 'text-slate-400')} />
  }
}

// Get status badge variant
function getStatusBadge(status: Document['status']) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">待解析</Badge>
    case 'parsing':
      return <Badge variant="info">解析中</Badge>
    case 'parsed':
      return <Badge variant="success">已解析</Badge>
    case 'failed':
      return <Badge variant="destructive">解析失败</Badge>
    default:
      return <Badge variant="outline">未知</Badge>
  }
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// Sort direction type
type SortDirection = 'asc' | 'desc' | null
type SortField = 'name' | 'size' | 'updatedAt' | 'status' | null

export function FileTable() {
  const {
    files,
    selectedFileIds,
    viewMode,
    searchQuery,
    toggleFileSelection,
    selectAllFiles,
    clearFileSelection,
    setSearchQuery,
    deleteSelectedFiles,
    parseSelectedFiles,
    setSelectedFile,
  } = useKBStore()

  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Filter files by selected KB and search query
  const filteredFiles = files.filter((file) => {
    // For demo, show all files. In real app, filter by selectedKBId
    const matchesSearch = searchQuery
      ? file.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    return matchesSearch
  })

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (!sortField || !sortDirection) return 0
    const multiplier = sortDirection === 'asc' ? 1 : -1

    switch (sortField) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name)
      case 'size':
        return multiplier * (a.size - b.size)
      case 'updatedAt':
        return multiplier * new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      case 'status':
        return multiplier * a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Render sort indicator
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-slate-300" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-green-500" />
    ) : (
      <ChevronDown className="w-3 h-3 text-green-500" />
    )
  }

  // Handle row click
  const handleRowClick = (file: Document, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile({
      ...file,
      versions: [
        { version: file.version, updatedAt: file.updatedAt },
        { version: 'v1.0', updatedAt: file.createdAt },
      ],
      parseDetails:
        file.status === 'parsed'
          ? { chunks: 42, vectors: 168 }
          : file.status === 'failed'
          ? { chunks: 0, vectors: 0, error: '文档格式不支持' }
          : undefined,
    })
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedFileIds.length === sortedFiles.length) {
      clearFileSelection()
    } else {
      selectAllFiles()
    }
  }

  // Check if any selected files can be parsed
  const hasPendingFiles = selectedFileIds.some((id) => {
    const file = files.find((f) => f.id === id)
    return file?.status === 'pending'
  })

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Upload button */}
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-1" />
          上传文件
        </Button>

        {/* Batch actions */}
        {selectedFileIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">已选 {selectedFileIds.length} 项</span>
            {hasPendingFiles && viewMode === 'files' && (
              <Button variant="outline" size="sm" onClick={parseSelectedFiles}>
                <Play className="w-4 h-4 mr-1" />
                解析
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={deleteSelectedFiles}>
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              {/* Checkbox column */}
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedFileIds.length === sortedFiles.length && sortedFiles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-green-500 focus:ring-green-500"
                />
              </th>

              {/* File name */}
              <th className="px-3 py-2 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  文件名
                  {renderSortIcon('name')}
                </button>
              </th>

              {/* Status */}
              <th className="px-3 py-2 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  状态
                  {renderSortIcon('status')}
                </button>
              </th>

              {/* Version */}
              <th className="px-3 py-2 text-left">
                <span className="text-xs font-medium text-slate-500">版本</span>
              </th>

              {/* Size */}
              <th className="px-3 py-2 text-left">
                <button
                  onClick={() => handleSort('size')}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  大小
                  {renderSortIcon('size')}
                </button>
              </th>

              {/* Updated */}
              <th className="px-3 py-2 text-left">
                <button
                  onClick={() => handleSort('updatedAt')}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  更新时间
                  {renderSortIcon('updatedAt')}
                </button>
              </th>

              {/* Actions */}
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedFiles.map((file) => (
              <tr
                key={file.id}
                onClick={(e) => handleRowClick(file, e)}
                className={cn(
                  'hover:bg-slate-50 cursor-pointer transition-colors',
                  selectedFileIds.includes(file.id) && 'bg-green-50'
                )}
              >
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
                <td className="px-3 py-2">{getStatusBadge(file.status)}</td>
                <td className="px-3 py-2">
                  <span className="text-sm text-slate-600">{file.version}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm text-slate-500">{formatSize(file.size)}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm text-slate-500">{formatDate(file.updatedAt)}</span>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {sortedFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mb-2" />
            <p className="text-sm">暂无文件</p>
          </div>
        )}
      </div>

      {/* Footer with pagination */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-500">共 {sortedFiles.length} 个文件</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>
            上一页
          </Button>
          <span className="text-xs text-slate-500">第 1 页</span>
          <Button variant="ghost" size="sm" disabled>
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}