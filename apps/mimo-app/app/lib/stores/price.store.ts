import { create } from 'zustand'
import type { Price, PriceStats } from '@mimo/shared'

interface PriceState {
  price: Price | null
  stats: PriceStats | null

  setPrice: (price: Price) => void
  setStats: (stats: PriceStats) => void
}

export const usePriceStore = create<PriceState>()((set) => ({
  price: null,
  stats: null,
  setPrice: (price) => set({ price }),
  setStats: (stats) => set({ stats }),
}))
