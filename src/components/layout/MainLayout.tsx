import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useLayoutStore } from '@/stores/layoutStore'
import { LayoutDashboard } from 'lucide-react'

export const MainLayout: React.FC = () => {
  const { toggleSidebar, sidebarOpen } = useLayoutStore()

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        {/* Toggle Button */}
        <div className="absolute top-4 right-8 z-50">
          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
            aria-expanded={sidebarOpen}
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <LayoutDashboard size={18} className="text-slate-400" />
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}