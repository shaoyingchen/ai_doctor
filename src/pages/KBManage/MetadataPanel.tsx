import { cn } from '@/lib/cn'
import { useKBStore } from '@/stores/kbStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  X,
  Tag,
  History,
  FileText,
  Layers,
  Database,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
} from 'lucide-react'

// Format date with time
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MetadataPanel() {
  const { selectedFile, setSelectedFile } = useKBStore()

  if (!selectedFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
        <FileText className="w-12 h-12 mb-2" />
        <p className="text-sm text-center">选择文件查看详细信息</p>
      </div>
    )
  }

  const handleClose = () => {
    setSelectedFile(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">文件详情</p>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardHeader className="py-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              解析状态
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">状态</span>
              {selectedFile.status === 'parsed' && (
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已解析
                </Badge>
              )}
              {selectedFile.status === 'parsing' && (
                <Badge variant="info">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  解析中
                </Badge>
              )}
              {selectedFile.status === 'pending' && (
                <Badge variant="secondary">待解析</Badge>
              )}
              {selectedFile.status === 'failed' && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  解析失败
                </Badge>
              )}
            </div>

            {selectedFile.parsedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">解析时间</span>
                <span className="text-sm text-slate-600">{formatDateTime(selectedFile.parsedAt)}</span>
              </div>
            )}

            {/* Parse details */}
            {selectedFile.parseDetails && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">分块数量</span>
                  <span className="text-sm text-slate-600">{selectedFile.parseDetails.chunks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">向量数量</span>
                  <span className="text-sm text-slate-600">{selectedFile.parseDetails.vectors}</span>
                </div>
                {selectedFile.parseDetails.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded-md">
                    <p className="text-xs text-red-600">{selectedFile.parseDetails.error}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Classification Card */}
        <Card>
          <CardHeader className="py-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              分类标注
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">分类</span>
              <span className="text-sm text-slate-600">{selectedFile.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">知识库</span>
              <span className="text-sm text-slate-600">个人库</span>
            </div>
          </CardContent>
        </Card>

        {/* Tags Card */}
        <Card>
          <CardHeader className="py-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              标签管理
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="flex flex-wrap gap-1.5">
              {selectedFile.tags.map((tag) => (
                <Badge key={tag} variant="outlinePrimary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              <button className="px-2 py-0.5 text-xs border border-dashed border-slate-300 rounded-full text-slate-400 hover:border-green-500 hover:text-green-500 transition-colors">
                + 添加标签
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Version History Card */}
        <Card>
          <CardHeader className="py-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              版本历史
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="space-y-2">
              {selectedFile.versions?.map((version, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-md',
                    index === 0 ? 'bg-green-50' : 'bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">{version.version}</span>
                    {index === 0 && (
                      <Badge variant="success" className="text-xs">
                        当前
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatDateTime(version.updatedAt)}</span>
                    {index !== 0 && (
                      <button className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File Info Card */}
        <Card>
          <CardHeader className="py-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-400" />
              文件信息
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">文件类型</span>
              <span className="text-sm text-slate-600 uppercase">{selectedFile.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">文件大小</span>
              <span className="text-sm text-slate-600">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">创建时间</span>
              <span className="text-sm text-slate-600">{formatDateTime(selectedFile.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">更新时间</span>
              <span className="text-sm text-slate-600">{formatDateTime(selectedFile.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-slate-200 space-y-2">
        <Button variant="outline" className="w-full" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          重新解析
        </Button>
        <Button variant="outline" className="w-full" size="sm">
          <Download className="w-4 h-4 mr-2" />
          下载原文件
        </Button>
      </div>
    </div>
  )
}