import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { useKBStore } from '@/stores/kbStore'
import { API_BASE_WITH_PATH } from '@/config/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParseProgress, calculateStages } from '@/components/ui/ParseProgress'
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Clock,
  Database,
  Download,
  FileText,
  History,
  Layers,
  RefreshCw,
  Tag,
  X,
} from 'lucide-react'

interface RagStateItem {
  docId: string
  status: 'pending' | 'parsing' | 'completed' | 'failed'
  progress: number
  currentStage: string
  error?: string | null
  updatedAt?: string
  parseChunks?: number
  vectorCount?: number
}

interface RagResultPayload {
  docId: string
  parse?: {
    chunks?: Array<{
      content?: string
      metadata?: Record<string, unknown>
    }>
    parse_quality_score?: number
    parser_engine?: string
    doc_strategy?: string
  }
  enhance?: {
    entities?: unknown[]
    qa_pairs?: unknown[]
    question_variants?: unknown[]
    enhance_quality_score?: number
  }
  updatedAt?: string
}

interface ChunkDetail {
  index: number
  text: string
  metadata: Record<string, unknown>
}

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
  const [showPipelineDetails, setShowPipelineDetails] = useState(false)
  const [ragState, setRagState] = useState<RagStateItem | null>(null)
  const [ragResult, setRagResult] = useState<RagResultPayload | null>(null)
  const [chunkDetails, setChunkDetails] = useState<ChunkDetail[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineError, setPipelineError] = useState<string | null>(null)

  const selectedFileId = selectedFile?.id ?? null

  const handleClose = () => setSelectedFile(null)
  const handleViewPipeline = () => setShowPipelineDetails(true)
  const handleBackToDetail = () => setShowPipelineDetails(false)

  const loadPipelineDetails = async () => {
    if (!selectedFileId) return
    setPipelineLoading(true)
    setPipelineError(null)
    try {
      const [stateRes, resultRes] = await Promise.all([
        fetch(API_BASE_WITH_PATH(`/api/rag/state/${selectedFileId}`)),
        fetch(API_BASE_WITH_PATH(`/api/rag/results/${selectedFileId}`)),
      ])

      if (!stateRes.ok) {
        throw new Error('加载 RAG 状态失败')
      }
      const stateData = await stateRes.json()
      setRagState((stateData.item || null) as RagStateItem | null)

      if (!resultRes.ok) {
        setRagResult(null)
        setChunkDetails([])
        return
      }

      const resultData = (await resultRes.json()) as RagResultPayload
      setRagResult(resultData)
      const chunks = resultData.parse?.chunks || []
      setChunkDetails(
        chunks.map((chunk, idx) => ({
          index: idx + 1,
          text: chunk.content || '',
          metadata: chunk.metadata || {},
        }))
      )
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : '加载 RAG 详情失败')
      setRagState(null)
      setRagResult(null)
      setChunkDetails([])
    } finally {
      setPipelineLoading(false)
    }
  }

  const handleRagReparse = async () => {
    if (!selectedFileId) return
    setPipelineLoading(true)
    setPipelineError(null)
    try {
      const rerunRes = await fetch(API_BASE_WITH_PATH(`/api/rag/retry/${selectedFileId}`), {
        method: 'POST',
      })
      if (!rerunRes.ok) throw new Error('RAG 重新解析失败')
      await loadPipelineDetails()
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : 'RAG 重新解析失败')
    } finally {
      setPipelineLoading(false)
    }
  }

  useEffect(() => {
    setShowPipelineDetails(false)
    setRagState(null)
    setRagResult(null)
    setChunkDetails([])
    setPipelineError(null)
  }, [selectedFileId])

  useEffect(() => {
    if (!showPipelineDetails || !selectedFileId) return
    void loadPipelineDetails()
    const interval = setInterval(() => void loadPipelineDetails(), 3000)
    return () => clearInterval(interval)
  }, [showPipelineDetails, selectedFileId])

  const progressValue = useMemo(() => {
    if (ragState) return ragState.progress
    if (selectedFile?.status === 'parsed') return 100
    if (selectedFile?.status === 'parsing') return 50
    return 0
  }, [ragState, selectedFile?.status])

  const currentStageText = ragState?.currentStage || (selectedFile?.status === 'parsed' ? 'Stored' : 'Pending')

  if (!selectedFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
        <FileText className="w-12 h-12 mb-2" />
        <p className="text-sm text-center">选择文件查看详细信息</p>
      </div>
    )
  }

  if (showPipelineDetails) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">RAG 状态流与分块详情</p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <Card>
            <CardHeader className="py-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                RAG Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-3">
              {pipelineError && <div className="p-2 bg-red-50 rounded-md text-xs text-red-600">{pipelineError}</div>}
              {pipelineLoading && <p className="text-xs text-slate-500">加载中...</p>}
              <ParseProgress
                stages={calculateStages(progressValue)}
                currentStage={currentStageText}
                progress={progressValue}
                error={ragState?.error || undefined}
              />
              {ragState && (
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>状态: {ragState.status}</div>
                  <div>进度: {ragState.progress}%</div>
                  <div>分块数: {ragState.parseChunks ?? 0}</div>
                  <div>向量数: {ragState.vectorCount ?? 0}</div>
                </div>
              )}
              {ragResult && (
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <div>Parse Score: {ragResult.parse?.parse_quality_score ?? '--'}</div>
                  <div>Enhance Score: {ragResult.enhance?.enhance_quality_score ?? '--'}</div>
                  <div>Parser Engine: {ragResult.parse?.parser_engine ?? '--'}</div>
                  <div>Doc Strategy: {ragResult.parse?.doc_strategy ?? '--'}</div>
                  <div>Entities: {ragResult.enhance?.entities?.length ?? 0}</div>
                  <div>QA Pairs: {ragResult.enhance?.qa_pairs?.length ?? 0}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                文档分块信息 ({chunkDetails.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-2">
              {chunkDetails.length === 0 && <p className="text-xs text-slate-500">暂无分块数据。</p>}
              {chunkDetails.map((chunk) => (
                <div key={chunk.index} className="border border-slate-200 rounded-md p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">分块 #{chunk.index}</span>
                    <span className="text-[11px] text-slate-400">{Object.keys(chunk.metadata || {}).length} 个元数据字段</span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">{chunk.text || '(空文本分块)'}</p>
                  {Object.keys(chunk.metadata || {}).length > 0 && (
                    <pre className="text-[11px] text-slate-500 bg-slate-50 rounded p-2 overflow-auto">{JSON.stringify(chunk.metadata, null, 2)}</pre>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 space-y-2">
          <Button variant="outline" className="w-full" size="sm" onClick={handleBackToDetail}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            返回文件详情
          </Button>
          <Button variant="outline" className="w-full" size="sm" onClick={() => void loadPipelineDetails()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新解析详情
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">文件详情</p>
        </div>
        <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
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
              {selectedFile.status === 'pending' && <Badge variant="secondary">待解析</Badge>}
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
          </CardContent>
        </Card>

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
            </div>
          </CardContent>
        </Card>

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
                  className={cn('flex items-center justify-between p-2 rounded-md', index === 0 ? 'bg-green-50' : 'bg-slate-50')}
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
              <span className="text-sm text-slate-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
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

      <div className="px-4 py-3 border-t border-slate-200 space-y-2">
        <Button variant="outline" className="w-full" size="sm" onClick={handleViewPipeline}>
          <Layers className="w-4 h-4 mr-2" />
          解析流水线
        </Button>
        <Button variant="outline" className="w-full" size="sm" onClick={() => void handleRagReparse()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重新解析
        </Button>
      </div>
    </div>
  )
}

