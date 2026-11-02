import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/lib/cn'
import {
  Database,
  CheckCircle,
  Clock,
  FileText,
  BookOpen,
  GitCompare,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  History
} from 'lucide-react'

const skillIcons: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  GitCompare: <GitCompare className="w-4 h-4" />,
  Lightbulb: <Lightbulb className="w-4 h-4" />,
}

export function SidePanel() {
  const {
    knowledgeBases,
    selectedKBs,
    quickSkills,
    chatHistory,
    toggleKB,
    loadSession,
    sidePanelOpen,
    toggleSidePanel,
  } = useChatStore()

  // Mock verification stats
  const verificationStats = {
    total: 12,
    verified: 10,
    pending: 2,
    accuracy: 95
  }

  if (!sidePanelOpen) {
    return (
      <button
        onClick={toggleSidePanel}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-100 border-r-0 rounded-l-lg p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 transition-colors shadow-sm"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="w-64 bg-white border-l border-slate-100 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">会话信息</h3>
        <button
          onClick={toggleSidePanel}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Knowledge Base Selection */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Database className="w-3.5 h-3.5" />
            检索范围
          </h4>
          <div className="space-y-1.5">
            {knowledgeBases.map((kb) => (
              <label
                key={kb.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all",
                  selectedKBs.includes(kb.id)
                    ? "border-primary/50 bg-primary-50/50"
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedKBs.includes(kb.id)}
                  onChange={() => toggleKB(kb.id)}
                  className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{kb.name}</p>
                  <p className="text-[10px] text-slate-400">{kb.documentCount} 文档</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Verification Status */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <CheckCircle className="w-3.5 h-3.5" />
            真实性验证
          </h4>
          <div className="bg-slate-50 rounded-lg px-2.5 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">已验证</span>
              <span className="text-xs font-medium text-green-600">{verificationStats.verified}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">待验证</span>
              <span className="text-xs font-medium text-amber-600">{verificationStats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">准确率</span>
              <span className="text-xs font-medium text-primary">{verificationStats.accuracy}%</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200/50">
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(verificationStats.verified / verificationStats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Skills */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Lightbulb className="w-3.5 h-3.5" />
            快捷技能
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {quickSkills.map((skill) => (
              <button
                key={skill.id}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-primary-50/50 transition-all group"
              >
                <span className="text-slate-400 group-hover:text-primary transition-colors">
                  {skillIcons[skill.icon] || <FileText className="w-3.5 h-3.5" />}
                </span>
                <span className="text-[10px] text-slate-600 group-hover:text-primary">{skill.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <History className="w-3.5 h-3.5" />
              历史记录
            </h4>
            <div className="space-y-1.5">
              {chatHistory.slice(0, 5).map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className="w-full text-left px-2.5 py-2 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-primary-50/50 transition-all"
                >
                  <p className="text-xs text-slate-700 truncate">{session.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(session.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <Clock className="w-3 h-3" />
          <span>会话已自动保存</span>
        </div>
      </div>
    </div>
  )
}