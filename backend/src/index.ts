import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { promises as fs } from 'fs'

// Types
type ParseStatus = 'pending' | 'uploading' | 'parsing' | 'chunking' | 'vectorizing' | 'completed' | 'failed'

interface ParseTask {
  id: string
  documentId: string
  documentName: string
  status: ParseStatus
  progress: number
  currentStage: string
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

interface ParsedDocument {
  id: string
  name: string
  type: string
  size: number
  path: string
  chunks: number
  content: string
  metadata: Record<string, any>
  createdAt: string
}

// Initialize app
const app = express()
app.use(cors())
app.use(express.json())

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url))

// Storage paths
const UPLOAD_DIR = join(__dirname, '../../uploads')
const PARSED_DIR = join(__dirname, '../../parsed-data')

// In-memory storage (replace with database in production)
const tasks: Map<string, ParseTask> = new Map()
const documents: Map<string, ParsedDocument> = new Map()

// Ensure directories exist
await fs.mkdir(UPLOAD_DIR, { recursive: true })
await fs.mkdir(PARSED_DIR, { recursive: true })

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = join(UPLOAD_DIR, new Date().toISOString().split('T')[0])
    await fs.mkdir(uploadPath, { recursive: true })
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase()
    const allowedTypes = ['.pdf', '.docx', '.doc', '.md', '.txt']
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件格式：${ext}`))
    }
  },
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Get all tasks
app.get('/api/tasks', (req, res) => {
  const allTasks = Array.from(tasks.values())
  res.json({ tasks: allTasks })
})

// Get single task
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.json({ task })
})

// Get all parsed documents
app.get('/api/documents', (req, res) => {
  const allDocs = Array.from(documents.values())
  res.json({ documents: allDocs })
})

// Upload file
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[]

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有文件' })
    }

    console.log(`\n=== 收到上传请求 ===`)
    console.log(`文件数量：${files.length}`)
    files.forEach(f => console.log(`  - ${f.originalname} (${f.size} bytes)`))

    const uploadedTasks: ParseTask[] = []

    for (const file of files) {
      const documentId = uuidv4()
      const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase()
      const fileType = ext.replace('.', '') as 'pdf' | 'docx' | 'doc' | 'md' | 'txt'

      const task: ParseTask = {
        id: uuidv4(),
        documentId,
        documentName: file.originalname,
        status: 'uploading',
        progress: 10,
        currentStage: '上传',
        createdAt: new Date().toISOString(),
      }

      tasks.set(task.id, task)
      uploadedTasks.push(task)

      // Store document metadata
      documents.set(documentId, {
        id: documentId,
        name: file.originalname,
        type: fileType,
        size: file.size,
        path: file.path,
        chunks: 0,
        content: '',
        metadata: {},
        createdAt: new Date().toISOString(),
      })

      console.log(`\n创建任务：${task.id}`)
      console.log(`文档 ID: ${documentId}`)
      console.log(`文件路径：${file.path}`)

      // Start parsing process (async)
      processDocument(task.id, documentId, file.path, ext).catch(console.error)
    }

    res.json({
      message: `已上传 ${files.length} 个文件`,
      tasks: uploadedTasks,
    })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : '上传失败' })
  }
})

// Process document
async function processDocument(
  taskId: string,
  documentId: string,
  filePath: string,
  ext: string
) {
  const task = tasks.get(taskId)
  const doc = documents.get(documentId)

  if (!task || !doc) {
    console.error(`Task or document not found: taskId=${taskId}, documentId=${documentId}`)
    return
  }

  try {
    // Update to parsing stage
    task.status = 'parsing'
    task.progress = 30
    task.currentStage = '解析'
    task.startedAt = new Date().toISOString()
    tasks.set(taskId, task)
    console.log(`\n[任务 ${taskId}] 开始解析...`)

    // Call Python parser service
    const parserResult = await callPythonParser(filePath, ext, taskId)
    console.log(`[任务 ${taskId}] 解析成功：${parserResult.chunks.length} 个分块`)

    // Update to chunking stage
    task.status = 'chunking'
    task.progress = 60
    task.currentStage = '分块'
    tasks.set(taskId, task)

    // Store parsed content
    doc.content = parserResult.content
    doc.chunks = parserResult.chunks.length
    doc.metadata = parserResult.metadata
    documents.set(documentId, doc)

    // Update to vectorizing stage
    task.status = 'vectorizing'
    task.progress = 80
    task.currentStage = '向量化'
    tasks.set(taskId, task)

    // TODO: Call embedding service here

    // Update to store stage
    task.status = 'completed'
    task.progress = 100
    task.currentStage = '入库'
    task.completedAt = new Date().toISOString()
    tasks.set(taskId, task)

    // Save parsed data to file
    const parsedFilePath = join(PARSED_DIR, `${documentId}.json`)
    await fs.writeFile(parsedFilePath, JSON.stringify(parserResult, null, 2))
    console.log(`[任务 ${taskId}] 完成！结果已保存到：${parsedFilePath}`)

  } catch (error) {
    console.error(`[任务 ${taskId}] 失败:`, error)
    task.status = 'failed'
    task.progress = 0
    task.currentStage = '解析失败'
    task.error = error instanceof Error ? error.message : '未知错误'
    tasks.set(taskId, task)
  }
}

// Call Python parser service
async function callPythonParser(
  filePath: string,
  ext: string,
  taskId: string
): Promise<{
  content: string
  chunks: Array<{ text: string; metadata: Record<string, any> }>
  metadata: Record<string, any>
}> {
  const PYTHON_PARSER_URL = 'http://localhost:8001'

  try {
    const fileContent = await fs.readFile(filePath)
    const formData = new FormData()
    formData.append('file', new Blob([fileContent]), 'file')
    formData.append('ext', ext)
    formData.append('task_id', taskId)

    const response = await fetch(`${PYTHON_PARSER_URL}/parse`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Python parser error: ${errorText}`)
    }

    return await response.json()

  } catch (error) {
    // If Python service is not available, return mock result for demo
    console.log('Python 服务不可用，返回模拟结果')
    return {
      content: `[模拟解析结果] 文件内容：${filePath}`,
      chunks: [
        { text: '这是模拟的分块内容 1', metadata: { page: 1 } },
        { text: '这是模拟的分块内容 2', metadata: { page: 2 } },
      ],
      metadata: { mock: true, parseTime: new Date().toISOString() }
    }
  }
}

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const taskId = req.params.id
  const task = tasks.get(taskId)

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  // Delete associated document
  const doc = documents.get(task.documentId)
  if (doc && doc.path) {
    fs.unlink(doc.path).catch(() => {})
  }
  if (doc) {
    documents.delete(task.documentId)
  }

  tasks.delete(taskId)
  res.json({ message: 'Task deleted' })
})

// Retry task
app.post('/api/tasks/:id/retry', (req, res) => {
  const taskId = req.params.id
  const task = tasks.get(taskId)

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  const doc = documents.get(task.documentId)
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' })
  }

  // Reset task status
  task.status = 'pending'
  task.progress = 0
  task.currentStage = '等待处理'
  task.error = undefined
  task.startedAt = undefined
  task.completedAt = undefined
  tasks.set(taskId, task)

  // Restart processing
  processDocument(taskId, task.documentId, doc.path, `.${doc.type}`).catch(console.error)

  res.json({ message: 'Task restarted', task })
})

// Get queue status
app.get('/api/queue/status', (req, res) => {
  const allTasks = Array.from(tasks.values())
  res.json({
    pending: allTasks.filter(t => t.status === 'pending').length,
    processing: allTasks.filter(t => ['uploading', 'parsing', 'chunking', 'vectorizing'].includes(t.status)).length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    failed: allTasks.filter(t => t.status === 'failed').length,
  })
})

// Start server
const port = 8000
app.listen(port, () => {
  console.log(`\n========================================`)
  console.log(`AI Doctor Backend Service`)
  console.log(`========================================`)
  console.log(`服务器启动在：http://localhost:${port}`)
  console.log(`上传目录：${UPLOAD_DIR}`)
  console.log(`数据目录：${PARSED_DIR}`)
  console.log(`========================================\n`)
})
