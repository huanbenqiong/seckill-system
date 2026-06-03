import type { Order } from '../types'
import { request } from './client'

type BackendOrder = Partial<Order> & {
  goodsImage?: string
  payTime?: string
  createTime?: string
}

function normalizeOrder(item: BackendOrder): Order {
  return {
    id: String(item.id ?? ''),
    userId: Number(item.userId ?? 0),
    goodsId: Number(item.goodsId ?? 0),
    goodsName: item.goodsName || '秒杀商品',
    goodsImg: item.goodsImg || item.goodsImage || '',
    seckillPrice: Number(item.seckillPrice ?? 0),
    quantity: Number(item.quantity ?? 1),
    totalAmount: Number(item.totalAmount ?? item.seckillPrice ?? 0),
    status: (item.status ?? 0) as Order['status'],
    createDate: item.createDate || item.createTime || new Date().toISOString(),
    payDate: item.payDate || item.payTime,
  }
}

export async function createSeckill(goodsId: number) {
  return request<string>(`/api/goods/seckill/${goodsId}`, { method: 'POST' })
}

export async function fetchOrderDetail(orderId: string) {
  const data = await request<BackendOrder>(`/api/order/detail/${orderId}`)
  return normalizeOrder(data)
}

export async function payOrder(orderId: string) {
  return request<void>(`/api/order/pay/${orderId}`, { method: 'POST' })
}
