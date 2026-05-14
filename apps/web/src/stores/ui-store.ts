import { create } from 'zustand'

export type InspectorTabType = 'Copilot' | 'Toolbar' | 'Editor'

interface UIState {
  inspectorTab: InspectorTabType
  setInspectorTab: (tab: InspectorTabType) => void
}

export const useUIStore = create<UIState>((set) => ({
  inspectorTab: 'Editor',
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
}))
