import { useState } from 'react'
import {
  FileText,
  Sparkles,
  Bot,
  Layers,
  Search,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Check,
  Folder,
  FolderOpen,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useTemplateStore,
  type TemplateTab,
  type CategoryNode,
} from '@/stores/templateStore'
import type { Template, TemplateVariable } from '@/types'

// 标签页配置
const tabConfig: { id: TemplateTab; label: string; icon: React.ReactNode }[] = [
  { id: 'document', label: '公文模板', icon: <FileText className="w-4 h-4" /> },
  { id: 'prompt', label: '提示词模板', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'agent', label: 'Agent模板', icon: <Bot className="w-4 h-4" /> },
  { id: 'instantiated', label: '已实例化', icon: <Layers className="w-4 h-4" /> },
]

// 知识库选项
const knowledgeBaseOptions = [
  { id: 'personal', name: '个人库' },
  { id: 'department', name: '单位库' },
  { id: 'public', name: '公共库' },
  { id: 'business', name: '业务库' },
]

// 分类导航组件
function CategoryNav({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: CategoryNode[]
  selectedCategory: string | null
  onSelect: (categoryId: string | null) => void
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIds(newSet)
  }

  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0)

  const renderNode = (node: CategoryNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedIds.has(node.id)
    const isSelected = selectedCategory === node.id

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
            isSelected
              ? 'bg-primary-50 text-primary'
              : 'hover:bg-slate-50 text-slate-700'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="p-0.5 hover:bg-slate-100 rounded"
            >
              <ChevronRight
                className={cn(
                  'w-3 h-3 transition-transform text-slate-400',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          <button
            onClick={() => onSelect(node.id)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-primary" />
              ) : (
                <Folder className="w-4 h-4 text-slate-400" />
              )
            ) : (
              <Folder className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-sm">{node.name}</span>
            <span className="text-xs text-slate-400 ml-auto">{node.count}</span>
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* 全部选项 */}
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          selectedCategory === null
            ? 'bg-primary-50 text-primary'
            : 'hover:bg-slate-50 text-slate-700'
        )}
        onClick={() => onSelect(null)}
      >
        <Layers className="w-4 h-4" />
        <span className="text-sm">全部</span>
        <span className="text-xs text-slate-400 ml-auto">{totalCount}</span>
      </div>
      {/* 分类树 */}
      {categories.map((cat) => renderNode(cat))}
    </div>
  )
}

// 模板卡片组件
function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: Template
  isSelected: boolean
  onSelect: () => void
}) {
  const [showPreview, setShowPreview] = useState(false)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4" />
      case 'prompt':
        return <Sparkles className="w-4 h-4" />
      case 'agent':
        return <Bot className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <>
      <Card
        hover
        className={cn(
          'transition-all',
          isSelected && 'ring-2 ring-primary border-primary'
        )}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getTypeIcon(template.type)}
              <CardTitle className="text-base">{template.name}</CardTitle>
            </div>
            {template.isOfficial && (
              <Badge variant="warning" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                官方
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-2">
            {template.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-wrap gap-1">
            {template.variables.slice(0, 3).map((v) => (
              <Badge key={v.name} variant="outline" className="text-xs">
                {v.label}
              </Badge>
            ))}
            {template.variables.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.variables.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2 border-t">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              使用 {template.usageCount} 次
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={(e) => {
                e.stopPropagation()
                setShowPreview(true)
              }}
            >
              <Eye className="w-3 h-3 mr-1" />
              预览
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* 预览弹窗 */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPreview(false)}
        >
          <Card
            className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{template.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  x
                </Button>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[60vh]">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                {template.content}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// 实例化面板组件
function InstantiationPanel() {
  const {
    activeTab,
    selectedTemplate,
    selectedInstance,
    instanceConfig,
    updateInstanceConfig,
    createInstance,
    deleteInstance,
    setSelectedTemplate,
  } = useTemplateStore()

  if (activeTab === 'instantiated') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-slate-800">实例详情</h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {selectedInstance ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  实例名称
                </label>
                <p className="text-slate-800 mt-1">{selectedInstance.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  基于模板
                </label>
                <p className="text-slate-800 mt-1">
                  {selectedInstance.templateName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  配置参数
                </label>
                <div className="mt-2 space-y-2">
                  {Object.entries(selectedInstance.config).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-500">{key}</span>
                      <span className="text-slate-800">{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  关联知识库
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedInstance.knowledgeBases.map((kb) => (
                    <Badge key={kb} variant="secondary">
                      {kb}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  AI增强
                </label>
                <p className="mt-1">
                  {selectedInstance.aiEnhanced ? (
                    <Badge variant="success">已开启</Badge>
                  ) : (
                    <Badge variant="secondary">未开启</Badge>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  创建时间
                </label>
                <p className="text-slate-800 mt-1">{selectedInstance.createdAt}</p>
              </div>
              <div className="pt-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => deleteInstance(selectedInstance.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除实例
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>选择一个实例查看详情</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!selectedTemplate) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-slate-800">实例化配置</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>选择一个模板进行实例化</p>
          </div>
        </div>
      </div>
    )
  }

  const renderVariableInput = (variable: TemplateVariable) => {
    const value = instanceConfig.variables[variable.name] || ''

    switch (variable.type) {
      case 'select':
        return (
          <select
            className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={value}
            onChange={(e) =>
              updateInstanceConfig({
                variables: { ...instanceConfig.variables, [variable.name]: e.target.value },
              })
            }
          >
            <option value="">请选择</option>
            {variable.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) =>
              updateInstanceConfig({
                variables: { ...instanceConfig.variables, [variable.name]: e.target.value },
              })
            }
          />
        )
      case 'knowledge_base':
        return (
          <select
            className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={value}
            onChange={(e) =>
              updateInstanceConfig({
                variables: { ...instanceConfig.variables, [variable.name]: e.target.value },
              })
            }
          >
            <option value="">请选择知识库</option>
            {knowledgeBaseOptions.map((kb) => (
              <option key={kb.id} value={kb.name}>
                {kb.name}
              </option>
            ))}
          </select>
        )
      default:
        return (
          <Input
            value={value}
            onChange={(e) =>
              updateInstanceConfig({
                variables: { ...instanceConfig.variables, [variable.name]: e.target.value },
              })
            }
            placeholder={`请输入${variable.label}`}
          />
        )
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">实例化配置</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTemplate(null)}
          >
            取消
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {/* 模板信息 */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium text-slate-800">
                {selectedTemplate.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {selectedTemplate.description}
            </p>
          </div>

          {/* 实例名称 */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              实例名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={instanceConfig.name}
              onChange={(e) => updateInstanceConfig({ name: e.target.value })}
              placeholder="请输入实例名称"
              className="mt-1"
            />
          </div>

          {/* 变量配置 */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              模板变量
            </label>
            <div className="space-y-3">
              {selectedTemplate.variables.map((variable) => (
                <div key={variable.name}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-sm text-slate-600">{variable.label}</span>
                    {variable.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </div>
                  {renderVariableInput(variable)}
                </div>
              ))}
            </div>
          </div>

          {/* 关联知识库 */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              关联知识库
            </label>
            <div className="space-y-2">
              {knowledgeBaseOptions.map((kb) => (
                <label
                  key={kb.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={instanceConfig.knowledgeBases.includes(kb.name)}
                    onChange={(e) => {
                      const newList = e.target.checked
                        ? [...instanceConfig.knowledgeBases, kb.name]
                        : instanceConfig.knowledgeBases.filter((k) => k !== kb.name)
                      updateInstanceConfig({ knowledgeBases: newList })
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">{kb.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* AI增强选项 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={instanceConfig.aiEnhanced}
                onChange={(e) =>
                  updateInstanceConfig({ aiEnhanced: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">
                  启用AI增强
                </span>
                <p className="text-xs text-slate-500">
                  启用后，AI将根据上下文自动优化生成内容
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
      <div className="p-4 border-t">
        <Button
          className="w-full"
          disabled={!instanceConfig.name}
          onClick={createInstance}
        >
          <Check className="w-4 h-4 mr-2" />
          创建实例
        </Button>
      </div>
    </div>
  )
}

export default function TemplatePage() {
  const {
    activeTab,
    setActiveTab,
    templates,
    instances,
    selectedCategory,
    setSelectedCategory,
    selectedTemplate,
    setSelectedTemplate,
    selectedInstance,
    setSelectedInstance,
    searchKeyword,
    setSearchKeyword,
    categories,
  } = useTemplateStore()

  // 根据标签页和分类筛选模板
  const filteredTemplates = templates.filter((t) => {
    const matchTab = activeTab !== 'instantiated' && t.type === activeTab
    const matchCategory = !selectedCategory || t.category === selectedCategory
    const matchSearch =
      !searchKeyword ||
      t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      t.description.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchTab && matchCategory && matchSearch
  })

  // 根据分类筛选实例
  const filteredInstances = instances.filter((inst) => {
    // 简单的搜索过滤
    const matchSearch =
      !searchKeyword ||
      inst.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      inst.templateName.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchSearch
  })

  const handleTabChange = (tab: TemplateTab) => {
    setActiveTab(tab)
    setSelectedCategory(null)
    setSelectedTemplate(null)
    setSelectedInstance(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标签页 */}
      <div className="bg-white border-b px-4 py-3">
        <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TemplateTab)}>
          <TabsList>
            {tabConfig.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 主内容区 - 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧分类导航 */}
        <div className="w-56 border-r bg-white overflow-auto">
          <div className="p-3 border-b">
            <h3 className="font-medium text-slate-800">分类导航</h3>
          </div>
          <div className="p-2">
            <CategoryNav
              categories={categories[activeTab]}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        </div>

        {/* 中间模板列表 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 搜索栏 */}
          <div className="p-3 border-b bg-white">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder="搜索模板..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>

          {/* 模板/实例卡片网格 */}
          <div className="flex-1 overflow-auto p-4 bg-white">
            {activeTab !== 'instantiated' ? (
              filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      onSelect={() => setSelectedTemplate(template)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无模板</p>
                  </div>
                </div>
              )
            ) : filteredInstances.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredInstances.map((instance) => (
                  <Card
                    key={instance.id}
                    hover
                    className={cn(
                      'transition-all',
                      selectedInstance?.id === instance.id &&
                        'ring-2 ring-primary border-primary'
                    )}
                    onClick={() => setSelectedInstance(instance)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <CardTitle className="text-base">{instance.name}</CardTitle>
                      </div>
                      <CardDescription>基于: {instance.templateName}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-1">
                        {instance.knowledgeBases.map((kb) => (
                          <Badge key={kb} variant="secondary" className="text-xs">
                            {kb}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 border-t">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-500">
                          {instance.createdAt}
                        </span>
                        {instance.aiEnhanced && (
                          <Badge variant="info" className="text-xs">
                            AI增强
                          </Badge>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                  <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>暂无实例化模板</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧实例化面板 */}
        <div className="w-80 border-l bg-white overflow-hidden">
          <InstantiationPanel />
        </div>
      </div>
    </div>
  )
}