import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { API_BASE_WITH_PATH } from '@/config/api'
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react'

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
  targetNode?: {
    id: string
    type: 'kb' | 'folder'
  } | null
}

const ALLOWED_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
}

const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_FILES = 10

export function FileUpload({ onUploadComplete, onClose }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`
    if (!ALLOWED_TYPES[ext]) {
      return `Unsupported file extension: ${ext}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 100MB)`
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
          id: Math.random().toString(36).slice(2, 9),
          progress: 0,
          status: 'pending',
        })
      }
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }
    if (validFiles.length + files.length > MAX_FILES) {
      alert(`At most ${MAX_FILES} files can be uploaded at once.`)
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
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [addFiles])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleUpload = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0) return

    try {
      const uploadedDocs: Array<{ id: string; name: string; type: string }> = []

      for (const pending of pendingFiles) {
        setFiles((prev) => prev.map((f) => (f.id === pending.id ? { ...f, status: 'uploading', progress: 20 } : f)))

        const formData = new FormData()
        formData.append('file', pending.file)

        const response = await fetch(API_BASE_WITH_PATH('/api/rag/end-to-end-file'), {
          method: 'POST',
          body: formData,
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.detail || result.error || `${pending.file.name} upload failed`)
        }

        setFiles((prev) => prev.map((f) => (f.id === pending.id ? { ...f, status: 'uploaded', progress: 100 } : f)))

        const resultFilename = result.filename || pending.file.name
        uploadedDocs.push({
          id: result.docId,
          name: resultFilename,
          type: resultFilename.split('.').pop()?.toLowerCase() || 'unknown',
        })
      }

      if (onUploadComplete && uploadedDocs.length > 0) {
        onUploadComplete(uploadedDocs)
      }
      setTimeout(onClose, 1000)
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          pendingFiles.find((pf) => pf.id === f.id)
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      )
    }
  }, [files, onClose, onUploadComplete])

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />
      case 'docx':
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'pptx':
      case 'ppt':
        return <FileText className="w-5 h-5 text-orange-500" />
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileText className="w-5 h-5 text-emerald-500" />
      case 'md':
        return <FileText className="w-5 h-5 text-purple-500" />
      default:
        return <FileText className="w-5 h-5 text-slate-500" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Upload Files</h2>
            <p className="text-sm text-slate-500 mt-0.5">RAG pipeline mode: PDF/DOCX/PPTX/XLSX/CSV/MD/TXT, max 100MB</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragOver ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-slate-400'
            )}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Drop files here, or</p>
            <button onClick={() => fileInputRef.current?.click()} className="text-green-600 hover:text-green-700 font-medium">
              choose files
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

          {files.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-auto">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  {getFileIcon(file.file.name.split('.').pop()?.toLowerCase() || '')}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.file.name}</p>
                    <p className="text-xs text-slate-500">{(file.file.size / 1024).toFixed(1)} KB</p>
                  </div>

                  {file.status === 'pending' && (
                    <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-slate-200 rounded">
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                  {file.status === 'uploading' && (
                    <div className="w-24">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${file.progress}%` }} />
                      </div>
                    </div>
                  )}
                  {file.status === 'uploaded' && <CheckCircle className="w-5 h-5 text-green-500" />}
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

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
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
            Upload {files.filter((f) => f.status === 'pending').length} file(s)
          </button>
        </div>
      </div>
    </div>
  )
}

