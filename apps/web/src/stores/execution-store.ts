import { create } from 'zustand'
import type { ExecutionLog } from '@/lib/api/contracts'

export interface ExecutionRun {
  id: string
  status: string
  logs: ExecutionLog[]
  timestamp: string
}

interface ExecutionState {
  currentExecutionId: string | null
  setCurrentExecutionId: (id: string | null) => void
  isExecutionPanelOpen: boolean
  setExecutionPanelOpen: (open: boolean) => void
  selectedLogId: string | null
  setSelectedLogId: (id: string | null) => void
  runs: ExecutionRun[]
  addRun: (id: string) => void
  updateRun: (id: string, logs: ExecutionLog[], status: string) => void
  clearRuns: () => void
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  currentExecutionId: null,
  setCurrentExecutionId: (id) => set({ currentExecutionId: id }),
  isExecutionPanelOpen: false,
  setExecutionPanelOpen: (open) => set({ isExecutionPanelOpen: open }),
  selectedLogId: null,
  setSelectedLogId: (id) => set({ selectedLogId: id }),
  runs: [],
  addRun: (id) =>
    set((state) => ({
      runs: [
        ...state.runs,
        { id, status: 'pending', logs: [], timestamp: new Date().toISOString() },
      ],
    })),
  updateRun: (id, logs, status) =>
    set((state) => ({
      runs: state.runs.map((r) => (r.id === id ? { ...r, logs, status } : r)),
    })),
  clearRuns: () => set({ runs: [], selectedLogId: null }),
}))
