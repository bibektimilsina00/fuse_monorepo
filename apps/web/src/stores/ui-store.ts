import { create } from 'zustand'

export type InspectorTabType = 'Copilot' | 'Toolbar' | 'Editor'
export type LogViewMode = 'structured' | 'raw'

interface UIState {
  inspectorTab: InspectorTabType
  setInspectorTab: (tab: InspectorTabType) => void
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  isSearchOpen: boolean
  setSearchOpen: (open: boolean) => void
  // Log inspector view preferences (persisted across remounts)
  logViewMode: LogViewMode
  setLogViewMode: (mode: LogViewMode) => void
  logWrapView: boolean
  setLogWrapView: (wrap: boolean) => void
  logOpenOnRun: boolean
  setLogOpenOnRun: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  inspectorTab: 'Editor',
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  logViewMode: 'structured',
  setLogViewMode: (mode) => set({ logViewMode: mode }),
  logWrapView: false,
  setLogWrapView: (wrap) => set({ logWrapView: wrap }),
  logOpenOnRun: true,
  setLogOpenOnRun: (open) => set({ logOpenOnRun: open }),
}))
