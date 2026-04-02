import { create } from 'zustand'

// 写作模板类型
export interface WriteTemplate {
  id: string
  name: string
  category: string
  description: string
  content: string
}

// 任务配置
export interface TaskConfig {
  organization: string
  topic: string
  date: string
  knowledgeBases: string[]
}

// AI生成记录
export interface AIGenerationRecord {
  id: string
  type: 'generate' | 'continue' | 'polish' | 'validate' | 'reference'
  timestamp: string
  content: string
}

// 历史公文参考
export interface HistoryReference {
  id: string
  title: string
  organization: string
  date: string
  similarity: number
}

// 格式校验结果
export interface ValidationResult {
  item: string
  status: 'pass' | 'warning' | 'error'
  message: string
}

interface WriteState {
  // 模板
  selectedTemplate: WriteTemplate | null
  templates: WriteTemplate[]

  // 编辑器内容
  content: string
  isGenerating: boolean

  // 任务配置
  taskConfig: TaskConfig

  // AI辅助
  aiRecords: AIGenerationRecord[]
  historyReferences: HistoryReference[]

  // 格式校验
  validationResults: ValidationResult[]

  // Actions
  setSelectedTemplate: (template: WriteTemplate | null) => void
  setContent: (content: string) => void
  setIsGenerating: (isGenerating: boolean) => void
  updateTaskConfig: (config: Partial<TaskConfig>) => void
  addAIRecord: (record: Omit<AIGenerationRecord, 'id' | 'timestamp'>) => void
  setHistoryReferences: (references: HistoryReference[]) => void
  setValidationResults: (results: ValidationResult[]) => void
  clearContent: () => void
}

// 默认模板列表
const defaultTemplates: WriteTemplate[] = [
  {
    id: '1',
    name: '会议通知',
    category: '通知类',
    description: '用于发布会议相关信息的通知模板',
    content: `【会议通知】

会议名称：[会议名称]
会议时间：[时间]
会议地点：[地点]
参会人员：[参会人员]

会议议程：
1. [议程一]
2. [议程二]
3. [议程三]

请各部门做好相关准备工作。

[发文单位]
[日期]`,
  },
  {
    id: '2',
    name: '请示报告',
    category: '报告类',
    description: '向上级请示或汇报工作的报告模板',
    content: `【请示报告】

关于[主题]的请示

[上级单位名称]：

[正文内容]

妥否，请批示。

[发文单位]
[日期]`,
  },
  {
    id: '3',
    name: '工作方案',
    category: '方案类',
    description: '工作实施方案的模板',
    content: `【工作方案】

[工作名称]工作方案

一、工作目标
[目标描述]

二、工作内容
[内容描述]

三、实施步骤
1. [步骤一]
2. [步骤二]

四、时间安排
[时间安排]

五、保障措施
[保障措施]

[发文单位]
[日期]`,
  },
  {
    id: '4',
    name: '工作总结',
    category: '总结类',
    description: '工作总结报告模板',
    content: `【工作总结】

[时间范围]工作总结

一、工作完成情况
[完成情况]

二、主要成效
[主要成效]

三、存在问题
[存在问题]

四、下一步计划
[下一步计划]

[发文单位]
[日期]`,
  },
  {
    id: '5',
    name: '通知公告',
    category: '通知类',
    description: '一般性通知公告模板',
    content: `【通知公告】

[通知标题]

[正文内容]

特此通知。

[发文单位]
[日期]`,
  },
]

// 模拟历史参考数据
const mockHistoryReferences: HistoryReference[] = [
  {
    id: '1',
    title: '关于开展数字化转型工作实施方案',
    organization: '信息化办公室',
    date: '2024-03-15',
    similarity: 0.92,
  },
  {
    id: '2',
    title: '2024年度信息化工作总结报告',
    organization: '综合办公室',
    date: '2024-01-20',
    similarity: 0.85,
  },
  {
    id: '3',
    title: '关于召开年度工作会议的通知',
    organization: '行政办公室',
    date: '2024-02-28',
    similarity: 0.78,
  },
]

export const useWriteStore = create<WriteState>((set) => ({
  // 初始状态
  selectedTemplate: null,
  templates: defaultTemplates,
  content: '',
  isGenerating: false,
  taskConfig: {
    organization: '',
    topic: '',
    date: new Date().toISOString().split('T')[0],
    knowledgeBases: [],
  },
  aiRecords: [],
  historyReferences: mockHistoryReferences,
  validationResults: [],

  // Actions
  setSelectedTemplate: (template) =>
    set((_state) => {
      if (template) {
        return {
          selectedTemplate: template,
          content: template.content,
        }
      }
      return { selectedTemplate: template }
    }),

  setContent: (content) => set({ content }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  updateTaskConfig: (config) =>
    set((state) => ({
      taskConfig: { ...state.taskConfig, ...config },
    })),

  addAIRecord: (record) =>
    set((state) => ({
      aiRecords: [
        {
          ...record,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
        },
        ...state.aiRecords,
      ].slice(0, 20), // 只保留最近20条
    })),

  setHistoryReferences: (references) => set({ historyReferences: references }),

  setValidationResults: (results) => set({ validationResults: results }),

  clearContent: () =>
    set({
      content: '',
      selectedTemplate: null,
      aiRecords: [],
      validationResults: [],
    }),
}))