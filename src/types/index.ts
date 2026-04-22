// 用户相关
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user'
  department?: string
  createdAt: string
}

// 知识库相关
export interface KnowledgeBase {
  id: string
  name: string
  type: 'personal' | 'department' | 'public' | 'business'
  description: string
  documentCount: number
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'docx' | 'txt' | 'md'
  size: number
  knowledgeBaseId: string
  folderId?: string
  status: 'pending' | 'parsing' | 'parsed' | 'failed'
  version: string
  tags: string[]
  category: string
  createdAt: string
  updatedAt: string
  parsedAt?: string
}

// 解析流水线相关
export interface ParseTask {
  id: string
  documentId: string
  documentName: string
  status: 'pending' | 'uploading' | 'parsing' | 'chunking' | 'vectorizing' | 'completed' | 'failed'
  progress: number
  currentStage: string
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface ParseStage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
}

// 对话相关
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: SourceReference[]
  verified?: boolean
}

export interface SourceReference {
  knowledgeBase: string
  document: string
  location: string
  confidence: number
}

// 搜索相关
export interface SearchResult {
  id: string
  title: string
  excerpt: string
  highlightedExcerpt: string
  documentType: string
  knowledgeBase: string
  matchScore: number
  createdAt: string
}

// 标注相关
export interface AnnotationTask {
  id: string
  documentId: string
  documentName: string
  status: 'pending' | 'in_progress' | 'approved' | 'rejected'
  autoAnnotations: AutoAnnotation[]
  manualAnnotations: ManualAnnotation[]
  createdAt: string
  reviewedAt?: string
  reviewer?: string
}

export interface AutoAnnotation {
  type: 'category' | 'entity' | 'keyword'
  value: string
  confidence: number
  location?: string  // 用于实体类型，表示实体类别
  start_pos?: number
  end_pos?: number
}

export interface ManualAnnotation {
  type: 'category' | 'entity' | 'keyword'
  value: string
  verified: boolean
}

// NLP 自动标注结果
export interface NLPAnnotationResult {
  success: boolean
  entities: EntityAnnotation[]
  keywords: KeywordAnnotation[]
  categories: CategoryAnnotation[]
  error?: string
}

export interface EntityAnnotation {
  type: 'organization' | 'location' | 'time' | 'number'
  value: string
  confidence: number
  location: string
  start_pos?: number
  end_pos?: number
}

export interface KeywordAnnotation {
  keyword: string
  confidence: number
  score?: number
}

export interface CategoryAnnotation {
  category: string
  confidence: number
  keywords?: string[]
}

// 知识增强相关
export interface QA {
  id: string
  question: string
  answer: string
  sourceDocument: string
  sourceLocation: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
  variations: string[]
  createdAt: string
}

// 模板相关
export interface Template {
  id: string
  name: string
  type: 'document' | 'prompt' | 'agent'
  category: string
  description: string
  content: string
  variables: TemplateVariable[]
  usageCount: number
  isOfficial: boolean
  createdAt: string
  updatedAt: string
}

export interface TemplateVariable {
  name: string
  label: string
  type: 'text' | 'select' | 'date' | 'knowledge_base'
  required: boolean
  defaultValue?: string
  options?: string[]
}

// 图谱相关
export interface GraphNode {
  id: string
  label: string
  type: 'person' | 'organization' | 'event' | 'location' | 'document'
  properties: Record<string, any>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'belongs_to' | 'collaborates' | 'references' | 'related'
  properties: Record<string, any>
}

// 统计相关
export interface Statistics {
  totalDocuments: number
  totalKnowledgeBases: number
  monthlyVisits: number
  activeUsers: number
  accuracy: number
  growthRate: {
    documents: number
    visits: number
    users: number
  }
}

export interface HotDocument {
  id: string
  title: string
  views: number
  trend: 'up' | 'down' | 'stable'
}

export interface KnowledgeGap {
  id: string
  keyword: string
  searchCount: number
  priority: 'urgent' | 'medium' | 'low'
  status: 'identified' | 'processing' | 'resolved'
}
