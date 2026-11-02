import { create } from 'zustand'
import type { Template } from '@/types'

// 模板实例
export interface TemplateInstance {
  id: string
  templateId: string
  templateName: string
  name: string
  config: Record<string, string>
  knowledgeBases: string[]
  aiEnhanced: boolean
  createdAt: string
}

// 分类树节点
export interface CategoryNode {
  id: string
  name: string
  count: number
  children?: CategoryNode[]
}

// 模板标签页类型
export type TemplateTab = 'document' | 'prompt' | 'agent' | 'instantiated'

interface TemplateState {
  // 当前标签页
  activeTab: TemplateTab

  // 模板数据
  templates: Template[]

  // 实例化模板
  instances: TemplateInstance[]

  // 选中的分类
  selectedCategory: string | null

  // 选中的模板
  selectedTemplate: Template | null

  // 选中的实例
  selectedInstance: TemplateInstance | null

  // 搜索关键词
  searchKeyword: string

  // 分类数据
  categories: Record<TemplateTab, CategoryNode[]>

  // 实例化面板配置
  instanceConfig: {
    name: string
    variables: Record<string, string>
    knowledgeBases: string[]
    aiEnhanced: boolean
  }

  // Actions
  setActiveTab: (tab: TemplateTab) => void
  setSelectedCategory: (category: string | null) => void
  setSelectedTemplate: (template: Template | null) => void
  setSelectedInstance: (instance: TemplateInstance | null) => void
  setSearchKeyword: (keyword: string) => void
  updateInstanceConfig: (config: Partial<TemplateState['instanceConfig']>) => void
  createInstance: () => void
  deleteInstance: (id: string) => void
}

// 默认分类数据
const defaultCategories: Record<TemplateTab, CategoryNode[]> = {
  document: [
    {
      id: 'official',
      name: '公文类',
      count: 24,
      children: [
        { id: 'notice', name: '通知公告', count: 8 },
        { id: 'report', name: '请示报告', count: 6 },
        { id: 'letter', name: '函件', count: 5 },
        { id: 'meeting', name: '会议纪要', count: 5 },
      ],
    },
    {
      id: 'business',
      name: '业务类',
      count: 18,
      children: [
        { id: 'plan', name: '工作方案', count: 7 },
        { id: 'summary', name: '工作总结', count: 6 },
        { id: 'research', name: '调研报告', count: 5 },
      ],
    },
    {
      id: 'internal',
      name: '内部类',
      count: 12,
      children: [
        { id: 'memo', name: '备忘录', count: 4 },
        { id: 'rule', name: '规章制度', count: 4 },
        { id: 'process', name: '流程文档', count: 4 },
      ],
    },
  ],
  prompt: [
    {
      id: 'writing',
      name: '写作辅助',
      count: 15,
      children: [
        { id: 'outline', name: '大纲生成', count: 5 },
        { id: 'polish', name: '润色优化', count: 5 },
        { id: 'translate', name: '翻译', count: 5 },
      ],
    },
    {
      id: 'analysis',
      name: '分析类',
      count: 12,
      children: [
        { id: 'data', name: '数据分析', count: 4 },
        { id: 'sentiment', name: '情感分析', count: 4 },
        { id: 'trend', name: '趋势分析', count: 4 },
      ],
    },
    {
      id: 'qa',
      name: '问答类',
      count: 8,
      children: [
        { id: 'faq', name: 'FAQ生成', count: 4 },
        { id: 'kb', name: '知识问答', count: 4 },
      ],
    },
  ],
  agent: [
    {
      id: 'assistant',
      name: '助手类',
      count: 10,
      children: [
        { id: 'doc-assist', name: '文档助手', count: 3 },
        { id: 'search-assist', name: '搜索助手', count: 3 },
        { id: 'write-assist', name: '写作助手', count: 4 },
      ],
    },
    {
      id: 'workflow',
      name: '流程类',
      count: 8,
      children: [
        { id: 'approval', name: '审批流程', count: 4 },
        { id: 'review', name: '审核流程', count: 4 },
      ],
    },
  ],
  instantiated: [
    {
      id: 'my-templates',
      name: '我的实例',
      count: 12,
    },
    {
      id: 'shared',
      name: '共享实例',
      count: 5,
    },
  ],
}

// 默认模板数据
const defaultTemplates: Template[] = [
  {
    id: '1',
    name: '会议通知模板',
    type: 'document',
    category: 'notice',
    description: '用于发布会议相关信息的通知模板，支持会议时间、地点、参会人员等信息的快速填写',
    content: `【会议通知】

会议名称：{{会议名称}}
会议时间：{{会议时间}}
会议地点：{{会议地点}}
参会人员：{{参会人员}}

会议议程：
1. {{议程一}}
2. {{议程二}}
3. {{议程三}}

请各部门做好相关准备工作。

{{发文单位}}
{{日期}}`,
    variables: [
      { name: '会议名称', label: '会议名称', type: 'text', required: true },
      { name: '会议时间', label: '会议时间', type: 'text', required: true },
      { name: '会议地点', label: '会议地点', type: 'text', required: true },
      { name: '参会人员', label: '参会人员', type: 'text', required: true },
      { name: '议程一', label: '议程一', type: 'text', required: false },
      { name: '议程二', label: '议程二', type: 'text', required: false },
      { name: '议程三', label: '议程三', type: 'text', required: false },
      { name: '发文单位', label: '发文单位', type: 'text', required: true },
      { name: '日期', label: '日期', type: 'date', required: true },
    ],
    usageCount: 156,
    isOfficial: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-03-20',
  },
  {
    id: '2',
    name: '请示报告模板',
    type: 'document',
    category: 'report',
    description: '向上级请示或汇报工作的报告模板，适用于各类请示事项',
    content: `【请示报告】

关于{{主题}}的请示

{{上级单位名称}}：

{{正文内容}}

妥否，请批示。

{{发文单位}}
{{日期}}`,
    variables: [
      { name: '主题', label: '请示主题', type: 'text', required: true },
      { name: '上级单位名称', label: '上级单位', type: 'text', required: true },
      { name: '正文内容', label: '正文内容', type: 'text', required: true },
      { name: '发文单位', label: '发文单位', type: 'text', required: true },
      { name: '日期', label: '日期', type: 'date', required: true },
    ],
    usageCount: 89,
    isOfficial: true,
    createdAt: '2024-01-10',
    updatedAt: '2024-02-28',
  },
  {
    id: '3',
    name: '工作方案模板',
    type: 'document',
    category: 'plan',
    description: '工作实施方案的标准模板，包含目标、内容、步骤、时间安排等模块',
    content: `【工作方案】

{{工作名称}}工作方案

一、工作目标
{{目标描述}}

二、工作内容
{{内容描述}}

三、实施步骤
1. {{步骤一}}
2. {{步骤二}}
3. {{步骤三}}

四、时间安排
{{时间安排}}

五、保障措施
{{保障措施}}

{{发文单位}}
{{日期}}`,
    variables: [
      { name: '工作名称', label: '工作名称', type: 'text', required: true },
      { name: '目标描述', label: '工作目标', type: 'text', required: true },
      { name: '内容描述', label: '工作内容', type: 'text', required: true },
      { name: '步骤一', label: '步骤一', type: 'text', required: false },
      { name: '步骤二', label: '步骤二', type: 'text', required: false },
      { name: '步骤三', label: '步骤三', type: 'text', required: false },
      { name: '时间安排', label: '时间安排', type: 'text', required: true },
      { name: '保障措施', label: '保障措施', type: 'text', required: false },
      { name: '发文单位', label: '发文单位', type: 'text', required: true },
      { name: '日期', label: '日期', type: 'date', required: true },
    ],
    usageCount: 124,
    isOfficial: true,
    createdAt: '2024-01-12',
    updatedAt: '2024-03-15',
  },
  {
    id: '4',
    name: '工作总结模板',
    type: 'document',
    category: 'summary',
    description: '工作总结报告模板，适用于年度、季度、月度等工作总结',
    content: `【工作总结】

{{时间范围}}工作总结

一、工作完成情况
{{完成情况}}

二、主要成效
{{主要成效}}

三、存在问题
{{存在问题}}

四、下一步计划
{{下一步计划}}

{{发文单位}}
{{日期}}`,
    variables: [
      { name: '时间范围', label: '时间范围', type: 'select', required: true, options: ['年度', '季度', '月度', '周'] },
      { name: '完成情况', label: '工作完成情况', type: 'text', required: true },
      { name: '主要成效', label: '主要成效', type: 'text', required: true },
      { name: '存在问题', label: '存在问题', type: 'text', required: false },
      { name: '下一步计划', label: '下一步计划', type: 'text', required: false },
      { name: '发文单位', label: '发文单位', type: 'text', required: true },
      { name: '日期', label: '日期', type: 'date', required: true },
    ],
    usageCount: 203,
    isOfficial: true,
    createdAt: '2024-01-08',
    updatedAt: '2024-03-18',
  },
  {
    id: '5',
    name: '文章润色提示词',
    type: 'prompt',
    category: 'polish',
    description: '用于文章润色和优化的提示词模板，支持多种风格调整',
    content: `请对以下文章进行润色优化：

原文：
{{原文内容}}

润色要求：
- 风格：{{风格}}
- 目标读者：{{目标读者}}
- 特殊要求：{{特殊要求}}

请保持原文核心意思不变，提升文章的可读性和专业性。`,
    variables: [
      { name: '原文内容', label: '原文内容', type: 'text', required: true },
      { name: '风格', label: '润色风格', type: 'select', required: true, options: ['正式', '简洁', '生动', '专业'] },
      { name: '目标读者', label: '目标读者', type: 'text', required: false },
      { name: '特殊要求', label: '特殊要求', type: 'text', required: false },
    ],
    usageCount: 89,
    isOfficial: true,
    createdAt: '2024-02-01',
    updatedAt: '2024-03-10',
  },
  {
    id: '6',
    name: '大纲生成提示词',
    type: 'prompt',
    category: 'outline',
    description: '用于生成文章大纲的提示词模板',
    content: `请为以下主题生成文章大纲：

主题：{{主题}}
文章类型：{{文章类型}}
篇幅要求：{{篇幅要求}}

请生成包含以下部分的大纲：
1. 引言
2. 主要内容（3-5个要点）
3. 结论

每个部分请简要说明要点。`,
    variables: [
      { name: '主题', label: '文章主题', type: 'text', required: true },
      { name: '文章类型', label: '文章类型', type: 'select', required: true, options: ['论文', '报告', '方案', '总结'] },
      { name: '篇幅要求', label: '篇幅要求', type: 'select', required: false, options: ['短篇（1000字以内）', '中篇（1000-3000字）', '长篇（3000字以上）'] },
    ],
    usageCount: 67,
    isOfficial: true,
    createdAt: '2024-02-05',
    updatedAt: '2024-03-12',
  },
  {
    id: '7',
    name: '文档助手Agent',
    type: 'agent',
    category: 'doc-assist',
    description: '智能文档处理助手，支持文档解析、摘要生成、内容提取等功能',
    content: `你是一个专业的文档助手，具备以下能力：

1. 文档解析：解析各类文档格式，提取关键信息
2. 摘要生成：生成文档摘要和要点
3. 内容提取：根据需求提取特定信息
4. 格式转换：支持多种格式之间的转换

处理文档时请遵循以下原则：
- 保持原文意思准确
- 提取信息完整
- 摘要简洁明了
- 格式规范统一`,
    variables: [
      { name: '处理模式', label: '处理模式', type: 'select', required: true, options: ['解析', '摘要', '提取', '转换'] },
      { name: '输出格式', label: '输出格式', type: 'select', required: false, options: ['JSON', 'Markdown', '纯文本'] },
    ],
    usageCount: 156,
    isOfficial: true,
    createdAt: '2024-02-10',
    updatedAt: '2024-03-20',
  },
  {
    id: '8',
    name: '写作助手Agent',
    type: 'agent',
    category: 'write-assist',
    description: '智能写作助手，支持公文写作、文章生成、内容优化等功能',
    content: `你是一个专业的写作助手，具备以下能力：

1. 公文写作：撰写各类公文，如通知、报告、方案等
2. 文章生成：根据主题和要求生成文章
3. 内容优化：润色和改进已有内容
4. 格式校验：检查文档格式是否符合规范

写作时请遵循以下原则：
- 内容准确、条理清晰
- 语言规范、表达得体
- 格式符合公文要求
- 注意行文逻辑`,
    variables: [
      { name: '写作类型', label: '写作类型', type: 'select', required: true, options: ['通知', '报告', '方案', '总结', '其他'] },
      { name: '参考知识库', label: '参考知识库', type: 'knowledge_base', required: false },
      { name: '风格要求', label: '风格要求', type: 'select', required: false, options: ['正式', '简洁', '详细'] },
    ],
    usageCount: 234,
    isOfficial: true,
    createdAt: '2024-02-15',
    updatedAt: '2024-03-22',
  },
]

// 默认实例数据
const defaultInstances: TemplateInstance[] = [
  {
    id: '1',
    templateId: '1',
    templateName: '会议通知模板',
    name: '周例会通知',
    config: {
      会议名称: '周例会',
      会议时间: '每周一上午9:00',
      会议地点: '三楼会议室',
    },
    knowledgeBases: ['个人库'],
    aiEnhanced: true,
    createdAt: '2024-03-15',
  },
  {
    id: '2',
    templateId: '4',
    templateName: '工作总结模板',
    name: '月度工作总结',
    config: {
      时间范围: '月度',
    },
    knowledgeBases: ['单位库'],
    aiEnhanced: false,
    createdAt: '2024-03-10',
  },
  {
    id: '3',
    templateId: '8',
    templateName: '写作助手Agent',
    name: '公文写作助手',
    config: {
      写作类型: '公文',
      风格要求: '正式',
    },
    knowledgeBases: ['公共库', '单位库'],
    aiEnhanced: true,
    createdAt: '2024-03-08',
  },
]

export const useTemplateStore = create<TemplateState>((set, get) => ({
  // 初始状态
  activeTab: 'document',
  templates: defaultTemplates,
  instances: defaultInstances,
  selectedCategory: null,
  selectedTemplate: null,
  selectedInstance: null,
  searchKeyword: '',
  categories: defaultCategories,
  instanceConfig: {
    name: '',
    variables: {},
    knowledgeBases: [],
    aiEnhanced: false,
  },

  // Actions
  setActiveTab: (tab) =>
    set({
      activeTab: tab,
      selectedCategory: null,
      selectedTemplate: null,
      selectedInstance: null,
    }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setSelectedTemplate: (template) =>
    set({
      selectedTemplate: template,
      instanceConfig: template
        ? {
            name: '',
            variables: template.variables.reduce((acc, v) => {
              acc[v.name] = v.defaultValue || ''
              return acc
            }, {} as Record<string, string>),
            knowledgeBases: [],
            aiEnhanced: false,
          }
        : {
            name: '',
            variables: {},
            knowledgeBases: [],
            aiEnhanced: false,
          },
    }),

  setSelectedInstance: (instance) => set({ selectedInstance: instance }),

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  updateInstanceConfig: (config) =>
    set((state) => ({
      instanceConfig: { ...state.instanceConfig, ...config },
    })),

  createInstance: () => {
    const state = get()
    const { selectedTemplate, instanceConfig, instances } = state

    if (!selectedTemplate || !instanceConfig.name) return

    const newInstance: TemplateInstance = {
      id: Date.now().toString(),
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      name: instanceConfig.name,
      config: instanceConfig.variables,
      knowledgeBases: instanceConfig.knowledgeBases,
      aiEnhanced: instanceConfig.aiEnhanced,
      createdAt: new Date().toISOString().split('T')[0],
    }

    set({
      instances: [newInstance, ...instances],
      selectedTemplate: null,
      instanceConfig: {
        name: '',
        variables: {},
        knowledgeBases: [],
        aiEnhanced: false,
      },
    })

    // 更新模板使用次数
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === selectedTemplate.id
          ? { ...t, usageCount: t.usageCount + 1 }
          : t
      ),
    }))
  },

  deleteInstance: (id) =>
    set((state) => ({
      instances: state.instances.filter((i) => i.id !== id),
      selectedInstance: state.selectedInstance?.id === id ? null : state.selectedInstance,
    })),
}))