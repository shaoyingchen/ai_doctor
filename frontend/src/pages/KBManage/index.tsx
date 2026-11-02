import { KBTree } from './KBTree'
import { FileTable } from './FileTable'
import { MetadataPanel } from './MetadataPanel'

export default function KBManage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">知识库管理</h1>
            <p className="text-sm text-slate-500 mt-0.5">管理文档、查看解析状态、配置元数据信息</p>
          </div>
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
          <FileTable />
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
export { PipelineView } from './PipelineView'
