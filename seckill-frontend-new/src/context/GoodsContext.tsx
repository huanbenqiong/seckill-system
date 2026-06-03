import { createContext, useContext, useState, type ReactNode } from 'react'
import { mockGoods } from '../data/mockData'
import type { SeckillGoods } from '../types'

interface GoodsContextValue {
  goods: SeckillGoods[]
  addGoods: (g: SeckillGoods) => void
}

const GoodsContext = createContext<GoodsContextValue | null>(null)

export function GoodsProvider({ children }: { children: ReactNode }) {
  const [goods, setGoods] = useState<SeckillGoods[]>(mockGoods)
  const addGoods = (g: SeckillGoods) => setGoods(prev => [g, ...prev])
  return <GoodsContext.Provider value={{ goods, addGoods }}>{children}</GoodsContext.Provider>
}

export function useGoods() {
  const ctx = useContext(GoodsContext)
  if (!ctx) throw new Error('useGoods must be inside GoodsProvider')
  return ctx
}
