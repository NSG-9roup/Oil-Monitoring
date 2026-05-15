import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface FilterState {
  alertSeverityFilter: 'all' | 'critical' | 'warning'
  alertStatusFilter: 'all' | 'open'
  timeRange: '7d' | '30d' | '90d' | '6m' | 'custom' | 'all'
  machineIdFilter: string | 'all'
  
  // Actions
  setAlertSeverityFilter: (severity: 'all' | 'critical' | 'warning') => void
  setAlertStatusFilter: (status: 'all' | 'open') => void
  setTimeRange: (range: '7d' | '30d' | '90d' | '6m' | 'custom' | 'all') => void
  setMachineIdFilter: (machineId: string | 'all') => void
  resetFilters: () => void
}

const defaultState = {
  alertSeverityFilter: 'all' as const,
  alertStatusFilter: 'all' as const,
  timeRange: 'all' as const,
  machineIdFilter: 'all' as const,
}

export const useFilterStore = create<FilterState>()(
  devtools((set) => ({
    ...defaultState,

    setAlertSeverityFilter: (severity) =>
      set({ alertSeverityFilter: severity }),

    setAlertStatusFilter: (status) =>
      set({ alertStatusFilter: status }),

    setTimeRange: (range) =>
      set({ timeRange: range }),

    setMachineIdFilter: (machineId) =>
      set({ machineIdFilter: machineId }),

    resetFilters: () =>
      set(defaultState),
  }))
)
