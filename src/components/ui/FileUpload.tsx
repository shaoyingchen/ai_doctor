import { useCallback, useState, useRef } from 'react'
import { cn } from '@/lib/cn'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  error?: string
}

interface FileUploadProps {
  onUploadComplete?: (files: Array<{ id: string; name: string; type: string }>) => void
  onClose: () => void
}

const ALLOWED_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_FILES = 10

export function FileUpload({ onUploadComplete, onClose }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!ALLOWED_TYPES[ext]) {
      return `不支持的文件格式：${ext}`
    }

    if (file.size > MAX_FILE_SIZE) {
      return `文件过大：${(file.size / 1024 / 1024).toFixed(1)}MB (最大 100MB)`
    }

    return null
  }

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: UploadFile[] = []
    const errors: string[] = []

    newFiles.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push({
          file,
          id: Math.random().toString(36).substring(2, 9),
          progress: 0,
          status: 'pending',
        })
      }
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (validFiles.length + files.length > MAX_FILES) {
      alert(`最多上传 ${MAX_FILES} 个文件`)
      return
    }

    setFiles((prev) => [...prev, ...validFiles])
  }, [files])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [addFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    addFiles(selectedFiles)

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [addFiles])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleUpload = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0) {
      console.error('[Upload] 没有待上传的文件')
      return
    }

    console.log('[Upload] 开始上传:', pendingFiles.map(f => f.file.name))

    const formData = new FormData()
    pendingFiles.forEach((f) => {
      console.log('[Upload] 添加文件:', f.file.name, '大小:', f.file.size, '类型:', f.file.type)
      formData.append('files', f.file)
    })

    // 检查 FormData 内容
    for (const [key, value] of formData.entries()) {
      console.log('[FormData]', key, value instanceof File ? `${(value as File).name} (${(value as File).size} bytes)` : value)
    }

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        pendingFiles.find((pf) => pf.id === f.id)
          ? { ...f, status: 'uploading', progress: 10 }
          : f
      )
    )

    try {
      console.log('[Upload] 发送请求到 http://localhost:8000/api/upload')
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('[Upload] 响应状态:', response.status)
      const result = await response.json()
      console.log('[Upload] 响应结果:', result)

      if (!response.ok) {
        throw new Error(result.error || '上传失败')
      }

      // Update files to uploaded
      setFiles((prev) =>
        prev.map((f) =>
          pendingFiles.find((pf) => pf.id === f.id)
            ? { ...f, status: 'uploaded', progress: 100 }
            : f
        )
      )

      // Notify parent
      if (onUploadComplete && result.tasks) {
        onUploadComplete(
          result.tasks.map((t: any) => ({
            id: t.documentId,
            name: t.documentName,
            type: t.documentName.split('.').pop()?.toLowerCase() || 'unknown',
          }))
        )
      }

      // Close modal after 1 second
      setTimeout(onClose, 1500)

    } catch (error) {
      console.error('Upload error:', error)
      setFiles((prev) =>
        prev.map((f) =>
          pendingFiles.find((pf) => pf.id === f.id)
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : '上传失败' }
            : f
        )
      )
    }
  }, [files, onUploadComplete, onClose])

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />
      case 'docx':
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'md':
        return <FileText className="w-5 h-5 text-purple-500" />
      default:
        return <FileText className="w-5 h-5 text-slate-500" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">上传文件</h2>
            <p className="text-sm text-slate-500 mt-0.5">支持 PDF、DOCX、MD、TXT 格式，最大 100MB</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragOver
                ? 'border-green-500 bg-green-50'
                : 'border-slate-300 hover:border-slate-400'
            )}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">拖拽文件到此处，或</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              点击选择文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={Object.keys(ALLOWED_TYPES).join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  {getFileIcon(file.file.name.split('.').pop()?.toLowerCase() || '')}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {/* Status */}
                  {file.status === 'pending' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}

                  {file.status === 'uploading' && (
                    <div className="w-24">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {file.status === 'uploaded' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}

                  {file.status === 'error' && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-xs text-red-600">{file.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={files.filter((f) => f.status === 'pending').length === 0}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              files.filter((f) => f.status === 'pending').length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            )}
          >
            上传 {files.filter((f) => f.status === 'pending').length} 个文件
          </button>
        </div>
      </div>
    </div>
  )
}
