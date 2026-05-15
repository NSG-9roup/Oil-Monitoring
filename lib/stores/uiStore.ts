import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  // Modal state
  activeModal: string | null
  
  // Expanded sections (admin)
  expandedCustomers: Set<string>
  expandedMachines: Set<string>
  
  // Sidebar state
  isSidebarCollapsed: boolean
  
  // Theme preference
  isDarkMode: boolean
  
  // Actions
  openModal: (modalId: string) => void
  closeModal: () => void
  toggleCustomer: (customerId: string) => void
  toggleMachine: (machineId: string) => void
  toggleSidebar: () => void
  toggleDarkMode: () => void
  reset: () => void
}

const defaultState = {
  activeModal: null as string | null,
  expandedCustomers: new Set<string>(),
  expandedMachines: new Set<string>(),
  isSidebarCollapsed: false,
  isDarkMode: false,
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        ...defaultState,

        openModal: (modalId) => set({ activeModal: modalId }),

        closeModal: () => set({ activeModal: null }),

        toggleCustomer: (customerId) =>
          set((state) => {
            const newSet = new Set(state.expandedCustomers)
            if (newSet.has(customerId)) {
              newSet.delete(customerId)
            } else {
              newSet.add(customerId)
            }
            return { expandedCustomers: newSet }
          }),

        toggleMachine: (machineId) =>
          set((state) => {
            const newSet = new Set(state.expandedMachines)
            if (newSet.has(machineId)) {
              newSet.delete(machineId)
            } else {
              newSet.add(machineId)
            }
            return { expandedMachines: newSet }
          }),

        toggleSidebar: () =>
          set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

        toggleDarkMode: () =>
          set((state) => ({ isDarkMode: !state.isDarkMode })),

        reset: () => set(defaultState),
      }),
      {
        name: 'ui-state',
        version: 1,
      }
    )
  )
)
