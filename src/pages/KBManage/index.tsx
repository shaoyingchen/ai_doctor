import { KBTree } from './KBTree'
import { FileTable } from './FileTable'
import { MetadataPanel } from './MetadataPanel'
import { useKBStore } from '@/stores/kbStore'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Layers } from 'lucide-react'

export default function KBManage() {
  const { viewMode, setViewMode, clearFileSelection } = useKBStore()

  const handleViewModeChange = (value: string) => {
    setViewMode(value as 'files' | 'pipeline')
    clearFileSelection()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">知识库管理</h1>
            <p className="text-sm text-slate-500 mt-0.5">管理文档、查看解析状态、配置元数据</p>
          </div>

          {/* View toggle */}
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList>
              <TabsTrigger value="files" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                文件库
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                解析流水线
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main content area - three column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - KB Tree */}
        <div className="w-64 border-r border-slate-200 bg-white overflow-hidden">
          <KBTree />
        </div>

        {/* Middle - File Table */}
        <div className="flex-1 bg-white overflow-hidden">
          {viewMode === 'files' ? (
            <FileTable />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Layers className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">解析流水线视图</p>
                <p className="text-xs mt-1">开发中...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right - Metadata Panel */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-hidden">
          <MetadataPanel />
        </div>
      </div>
    </div>
  )
}

// Re-export for convenience
export { KBTree } from './KBTree'
export { FileTable } from './FileTable'
export { MetadataPanel } from './MetadataPanel'