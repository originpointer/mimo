import { create } from 'zustand'
import type { PriceAlert } from '@mimo/shared'

interface AlertState {
  alerts: PriceAlert[]
  addAlert: (alert: PriceAlert) => void
  removeAlert: (id: string) => void
  setAlerts: (alerts: PriceAlert[]) => void
}

export const useAlertStore = create<AlertState>()((set) => ({
  alerts: [],
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),
  removeAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  setAlerts: (alerts) => set({ alerts }),
}))
