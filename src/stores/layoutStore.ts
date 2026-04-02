import { create } from 'zustand'

interface LayoutState {
  sidebarOpen: boolean
  activeMenu: string
  toggleSidebar: () => void
  setActiveMenu: (menu: string) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  activeMenu: 'ai-doctor',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveMenu: (menu) => set({ activeMenu: menu }),
}))