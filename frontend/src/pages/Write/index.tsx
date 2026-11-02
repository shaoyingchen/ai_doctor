import { TemplatePanel } from './TemplatePanel'
import { Editor } from './Editor'
import { ConfigPanel } from './ConfigPanel'

export default function Write() {
  return (
    <div className="flex h-full bg-white">
      {/* 左侧模板面板 */}
      <div className="w-72 flex-shrink-0 border-r border-slate-100 bg-slate-50">
        <TemplatePanel />
      </div>

      {/* 中间编辑器区域 */}
      <div className="flex-1 min-w-0">
        <Editor />
      </div>

      {/* 右侧配置面板 */}
      <div className="w-80 flex-shrink-0 border-l border-slate-100 bg-slate-50">
        <ConfigPanel />
      </div>
    </div>
  )
}