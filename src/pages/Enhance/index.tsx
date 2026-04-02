import type { EnhanceTab } from '@/stores/enhanceStore'
import { useEnhanceStore } from '@/stores/enhanceStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { QA } from '@/types'

// Icons as simple SVG components
const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const SourceIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

// Left Panel - Task Management
function TaskManagementPanel() {
  const { sourceDocuments, selectedDocument, setSelectedDocument, datasets, qualityMetrics } = useEnhanceStore()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">已完成</Badge>
      case 'processing':
        return <Badge variant="info">处理中</Badge>
      default:
        return <Badge variant="secondary">待处理</Badge>
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Task Statistics */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">任务统计</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">{qualityMetrics.approvedQA}</div>
              <div className="text-xs text-slate-500">已通过</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <div className="text-lg font-semibold text-yellow-600">{qualityMetrics.pendingQA}</div>
              <div className="text-xs text-slate-500">待审核</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <div className="text-lg font-semibold text-slate-600">{qualityMetrics.totalQA}</div>
              <div className="text-xs text-slate-500">总计</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Documents */}
      <Card className="flex-1 mb-4 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileIcon />
            来源文档
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto max-h-[calc(50vh-120px)]">
          <div className="space-y-2">
            {sourceDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(selectedDocument === doc.id ? null : doc.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDocument === doc.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate flex-1">{doc.name}</span>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>QA: {doc.qaCount}</span>
                  <span>泛化: {doc.generalizeCount}</span>
                  <span>拆解: {doc.decomposeCount}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Datasets */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DatabaseIcon />
            数据集
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto max-h-[calc(30vh-80px)]">
          <div className="space-y-2">
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dataset.name}</span>
                  <Badge variant={dataset.type === 'train' ? 'default' : dataset.type === 'valid' ? 'info' : 'warning'}>
                    {dataset.type === 'train' ? '训练集' : dataset.type === 'valid' ? '验证集' : '测试集'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {dataset.recordCount} 条记录 · {dataset.createdAt}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// QA Card Component
function QACard({ qa, isSelected, onClick }: { qa: QA; isSelected: boolean; onClick: () => void }) {
  const { approveQA, rejectQA } = useEnhanceStore()

  const getStatusBadge = () => {
    switch (qa.status) {
      case 'approved':
        return <Badge variant="success">已通过</Badge>
      case 'rejected':
        return <Badge variant="destructive">已驳回</Badge>
      default:
        return <Badge variant="warning">待审核</Badge>
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-green-500 bg-green-50'
          : 'border-slate-200 hover:border-green-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-2">
          <div className="font-medium text-slate-800 mb-1">{qa.question}</div>
          <div className="text-sm text-slate-600 line-clamp-2">{qa.answer}</div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Source tracing */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 p-2 bg-slate-50 rounded">
        <SourceIcon />
        <span className="font-medium">{qa.sourceDocument}</span>
        <span className="text-slate-300">|</span>
        <span>{qa.sourceLocation}</span>
        <span className="text-slate-300">|</span>
        <span className={getConfidenceColor(qa.confidence)}>
          置信度: {(qa.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Variations */}
      {qa.variations.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {qa.variations.map((v, i) => (
            <span key={i} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {qa.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              approveQA(qa.id)
            }}
          >
            <CheckIcon />
            <span className="ml-1">通过</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              rejectQA(qa.id)
            }}
          >
            <XIcon />
            <span className="ml-1">驳回</span>
          </Button>
        </div>
      )}
    </div>
  )
}

// QA Tab Content
function QAContent() {
  const { qaList, selectedQA, setSelectedQA, searchQuery, setSearchQuery, filterStatus, setFilterStatus, generateQA } = useEnhanceStore()

  const filteredQA = qaList.filter((qa) => {
    const matchesSearch = qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qa.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || qa.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="搜索问答对..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<SearchIcon />}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
          className="h-10 px-3 rounded-md border border-slate-200 text-sm"
        >
          <option value="all">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>
        <Button onClick={generateQA}>
          <PlusIcon />
          <span className="ml-1">生成QA</span>
        </Button>
      </div>

      {/* QA List */}
      <div className="flex-1 overflow-auto space-y-3">
        {filteredQA.map((qa) => (
          <QACard
            key={qa.id}
            qa={qa}
            isSelected={selectedQA?.id === qa.id}
            onClick={() => setSelectedQA(selectedQA?.id === qa.id ? null : qa)}
          />
        ))}
        {filteredQA.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            暂无匹配的问答对
          </div>
        )}
      </div>
    </div>
  )
}

// Generalize Tab Content
function GeneralizeContent() {
  const { generalizeList } = useEnhanceStore()

  return (
    <div className="space-y-4">
      {generalizeList.map((item) => (
        <Card key={item.id} hover>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="font-medium text-slate-800">{item.originalQuestion}</div>
              <Badge variant={item.status === 'approved' ? 'success' : 'warning'}>
                {item.status === 'approved' ? '已通过' : '待审核'}
              </Badge>
            </div>
            <div className="text-sm text-slate-500 mb-3">同义问法:</div>
            <div className="flex flex-wrap gap-2">
              {item.variations.map((v, i) => (
                <span key={i} className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-full border border-green-200">
                  {v}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Decompose Tab Content
function DecomposeContent() {
  const { decomposeList } = useEnhanceStore()

  return (
    <div className="space-y-4">
      {decomposeList.map((item) => (
        <Card key={item.id} hover>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm text-slate-600 flex-1">{item.sourceText}</div>
              <Badge variant={item.status === 'approved' ? 'success' : 'warning'}>
                {item.status === 'approved' ? '已通过' : '待审核'}
              </Badge>
            </div>
            <div className="text-sm text-slate-500 mb-2">知识单元:</div>
            <div className="flex flex-wrap gap-2">
              {item.knowledgeUnits.map((unit, i) => (
                <span key={i} className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  {unit}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Dataset Tab Content
function DatasetContent() {
  const { datasets } = useEnhanceStore()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">数据集管理</h3>
        <Button size="sm">
          <PlusIcon />
          <span className="ml-1">新建数据集</span>
        </Button>
      </div>
      <div className="grid gap-4">
        {datasets.map((dataset) => (
          <Card key={dataset.id} hover>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{dataset.name}</div>
                <Badge variant={dataset.type === 'train' ? 'default' : dataset.type === 'valid' ? 'info' : 'warning'}>
                  {dataset.type === 'train' ? '训练集' : dataset.type === 'valid' ? '验证集' : '测试集'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{dataset.recordCount} 条记录</span>
                <span>创建于 {dataset.createdAt}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline">导出</Button>
                <Button size="sm" variant="outline">预览</Button>
                <Button size="sm" variant="ghost" className="text-slate-500">删除</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Right Panel - Config & Statistics
function ConfigPanel() {
  const { generationConfig, updateConfig, qualityMetrics } = useEnhanceStore()

  return (
    <div className="space-y-4">
      {/* Generation Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">模型选择</label>
            <select
              value={generationConfig.model}
              onChange={(e) => updateConfig({ model: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3">Claude 3</option>
              <option value="qwen-max">通义千问 Max</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">生成粒度</label>
            <select
              value={generationConfig.granularity}
              onChange={(e) => updateConfig({ granularity: e.target.value as 'fine' | 'medium' | 'coarse' })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
            >
              <option value="fine">精细粒度</option>
              <option value="medium">中等粒度</option>
              <option value="coarse">粗粒度</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">每文档最大QA数</label>
            <input
              type="number"
              value={generationConfig.maxQAPerDoc}
              onChange={(e) => updateConfig({ maxQAPerDoc: parseInt(e.target.value) })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">自动审核通过</label>
            <button
              onClick={() => updateConfig({ autoApprove: !generationConfig.autoApprove })}
              className={`w-12 h-6 rounded-full transition-colors ${
                generationConfig.autoApprove ? 'bg-green-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                generationConfig.autoApprove ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">质量统计</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">总QA数</span>
            <span className="font-medium">{qualityMetrics.totalQA}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">已通过</span>
            <span className="font-medium text-green-600">{qualityMetrics.approvedQA}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">待审核</span>
            <span className="font-medium text-yellow-600">{qualityMetrics.pendingQA}</span>
          </div>
          <div className="h-px bg-slate-200" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">平均置信度</span>
            <span className="font-medium">{(qualityMetrics.avgConfidence * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">覆盖率</span>
            <span className="font-medium">{(qualityMetrics.coverageRate * 100).toFixed(1)}%</span>
          </div>

          {/* Progress bars */}
          <div className="pt-2">
            <div className="text-sm text-slate-600 mb-1">审核进度</div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(qualityMetrics.approvedQA / qualityMetrics.totalQA) * 100}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1 text-right">
              {((qualityMetrics.approvedQA / qualityMetrics.totalQA) * 100).toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">快捷操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            批量审核通过
          </Button>
          <Button variant="outline" className="w-full justify-start">
            导出QA数据
          </Button>
          <Button variant="outline" className="w-full justify-start">
            同步到知识库
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Component
export default function Enhance() {
  const { activeTab, setActiveTab } = useEnhanceStore()

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left Panel - Task Management */}
      <div className="w-72 border-r border-slate-200 bg-white p-4 overflow-hidden">
        <TaskManagementPanel />
      </div>

      {/* Center Panel - Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EnhanceTab)}>
            <TabsList>
              <TabsTrigger value="qa">QA生成</TabsTrigger>
              <TabsTrigger value="generalize">泛化处理</TabsTrigger>
              <TabsTrigger value="decompose">拆解处理</TabsTrigger>
              <TabsTrigger value="dataset">数据集</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'qa' && <QAContent />}
          {activeTab === 'generalize' && <GeneralizeContent />}
          {activeTab === 'decompose' && <DecomposeContent />}
          {activeTab === 'dataset' && <DatasetContent />}
        </div>
      </div>

      {/* Right Panel - Config & Statistics */}
      <div className="w-80 border-l border-slate-200 bg-white p-4 overflow-auto">
        <ConfigPanel />
      </div>
    </div>
  )
}