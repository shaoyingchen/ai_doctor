import { create } from 'zustand'

interface LayoutState {
  sidebarOpen: boolean
  sidePanelOpen: boolean
  activeMenu: string
  toggleSidebar: () => void
  toggleSidePanel: () => void
  setActiveMenu: (menu: string) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  sidePanelOpen: true,
  activeMenu: 'ai-doctor',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidePanel: () => set((state) => ({ sidePanelOpen: !state.sidePanelOpen })),
  setActiveMenu: (menu) => set({ activeMenu: menu }),
}))