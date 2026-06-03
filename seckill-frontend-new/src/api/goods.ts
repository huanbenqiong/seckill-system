import { mockGoods } from '../data/mockData'
import type { SeckillGoods } from '../types'
import { request } from './client'

type BackendGoods = Partial<SeckillGoods> & {
  goodsImage?: string
  originalPrice?: number
  description?: string
  startTime?: string
  endTime?: string
}

function normalizeGoods(item: BackendGoods): SeckillGoods {
  return {
    id: Number(item.id ?? item.goodsId ?? 0),
    goodsId: Number(item.goodsId ?? item.id ?? 0),
    goodsName: item.goodsName || '秒杀商品',
    goodsTitle: item.goodsTitle || item.description || '限时秒杀，库存有限',
    goodsImg: item.goodsImg || item.goodsImage || '',
    goodsPrice: Number(item.goodsPrice ?? item.originalPrice ?? item.seckillPrice ?? 0),
    seckillPrice: Number(item.seckillPrice ?? 0),
    stockCount: Number(item.stockCount ?? 0),
    soldCount: Number(item.soldCount ?? 0),
    startDate: item.startDate || item.startTime || new Date().toISOString(),
    endDate: item.endDate || item.endTime || new Date(Date.now() + 3600000).toISOString(),
    status: (item.status ?? 2) as SeckillGoods['status'],
    limitCount: Number(item.limitCount ?? 1),
    totalStock: Number(item.totalStock ?? (Number(item.stockCount ?? 0) + Number(item.soldCount ?? 0))),
  }
}

export async function fetchGoodsList() {
  const data = await request<BackendGoods[]>('/api/goods/list')
  return Array.isArray(data) ? data.map(normalizeGoods) : []
}

export async function fetchGoodsDetail(id: number) {
  const data = await request<BackendGoods>(`/api/goods/detail/${id}`)
  return normalizeGoods(data)
}

export function getMockGoodsDetail(id: number) {
  return mockGoods.find((item) => item.id === id || item.goodsId === id) ?? null
}

export function getMockGoodsList() {
  return mockGoods
}
