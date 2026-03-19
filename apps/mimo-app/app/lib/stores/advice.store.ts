import { create } from 'zustand'
import type { DecisionAdvice } from '@mimo/shared'

interface AdviceState {
  advice: DecisionAdvice | null

  setAdvice: (advice: DecisionAdvice) => void
}

export const useAdviceStore = create<AdviceState>()((set) => ({
  advice: null,
  setAdvice: (advice) => set({ advice }),
}))
