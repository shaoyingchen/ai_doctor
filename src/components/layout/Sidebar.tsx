import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Cpu, Search, PenTool, BookOpen, Database,
  Settings, RefreshCw, Sparkles, FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: 'ai-doctor',
    label: 'AI 博士对话',
    icon: <Cpu size={18} />,
    path: '/ai-doctor',
  },
  {
    id: 'search',
    label: '智能搜索',
    icon: <Search size={18} />,
    path: '/search',
  },
  {
    id: 'write',
    label: '智能写作',
    icon: <PenTool size={18} />,
    path: '/write',
  },
  {
    id: 'kb',
    label: '知识库',
    icon: <BookOpen size={18} />,
    path: '/kb',
  },
  {
    id: 'pipeline',
    label: '解析流水线',
    icon: <RefreshCw size={18} />,
    path: '/pipeline',
  },
  {
    id: 'annotation',
    label: '语料标注',
    icon: <PenTool size={18} />,
    path: '/annotation',
  },
  {
    id: 'enhance',
    label: '知识增强',
    icon: <Sparkles size={18} />,
    path: '/enhance',
  },
  {
    id: 'flywheel',
    label: '知识运营',
    icon: <RefreshCw size={18} />,
    path: '/flywheel',
  },
  {
    id: 'template',
    label: '模板库',
    icon: <Database size={18} />,
    path: '/template',
  },
  {
    id: 'graph',
    label: '知识图谱',
    icon: <FolderOpen size={18} />,
    path: '/graph',
  },
  {
    id: 'analytics',
    label: '数据分析',
    icon: <Database size={18} />,
    path: '/analytics',
  },
]

export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleMenuClick = (item: MenuItem) => {
    navigate(item.path)
  }

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-slate-200 bg-white">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
          <BookOpen size={20} />
        </div>
        <span className="font-bold text-slate-700 tracking-tight truncate">
          AI Doctor
        </span>
      </div>

      {/* Menu */}
      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <nav className="px-2 space-y-1" aria-label="主导航">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              aria-label={item.label}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                location.pathname === item.path
                  ? "bg-primary text-white font-medium shadow-md"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
            张
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-700 truncate">张三</div>
            <div className="text-[10px] text-slate-400 truncate">在线 · 浦东办公室</div>
          </div>
          <Settings size={14} className="text-slate-300 hover:text-slate-600 cursor-pointer" />
        </div>
      </div>
    </div>
  )
}
