import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { DashboardAlert } from '@/lib/alerts/engine'

interface AlertStoreState {
  // State
  openAlerts: DashboardAlert[]
  closedAlertIds: Set<string>
  selectedAlert: DashboardAlert | null
  
  // Actions
  setOpenAlerts: (alerts: DashboardAlert[]) => void
  closeAlert: (alertId: string) => void
  reopenAlert: (alertId: string) => void
  markAsReviewed: (alertId: string) => void
  selectAlert: (alert: DashboardAlert | null) => void
  clearAllAlerts: () => void
}

export const useAlertStore = create<AlertStoreState>()(
  devtools((set) => ({
    openAlerts: [],
    closedAlertIds: new Set(),
    selectedAlert: null,

    setOpenAlerts: (alerts) => set({ openAlerts: alerts }),

    closeAlert: (alertId) =>
      set((state) => ({
        closedAlertIds: new Set([...state.closedAlertIds, alertId]),
        selectedAlert: state.selectedAlert?.id === alertId ? null : state.selectedAlert,
      })),

    reopenAlert: (alertId) =>
      set((state) => {
        const newClosed = new Set(state.closedAlertIds)
        newClosed.delete(alertId)
        return { closedAlertIds: newClosed }
      }),

    markAsReviewed: (alertId) =>
      set((state) => ({
        openAlerts: state.openAlerts.map((alert) =>
          alert.id === alertId ? { ...alert, reviewed: true } : alert
        ),
      })),

    selectAlert: (alert) => set({ selectedAlert: alert }),

    clearAllAlerts: () =>
      set({
        openAlerts: [],
        closedAlertIds: new Set(),
        selectedAlert: null,
      }),
  }))
)
