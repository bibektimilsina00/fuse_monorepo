import { create } from 'zustand'

export type InspectorTabType = 'Copilot' | 'Toolbar' | 'Editor'

interface UIState {
  inspectorTab: InspectorTabType
  setInspectorTab: (tab: InspectorTabType) => void
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  isSearchOpen: boolean
  setSearchOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  inspectorTab: 'Editor',
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}))

