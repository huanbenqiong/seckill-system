import type { SeckillGoods, Order, DashboardStats, TrafficDataPoint } from '../types'

// 生成未来时间
const future = (hours: number) => {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

const past = (hours: number) => {
  const d = new Date()
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

export const mockGoods: SeckillGoods[] = [
  {
    id: 300001,
    goodsId: 200001,
    goodsName: 'Apple iPhone 15 Pro',
    goodsTitle: 'A17 Pro 芯片 · 钛金属机身 · 超视网膜 ProMotion 显示屏',
    goodsImg: 'https://loremflickr.com/400/400/iphone,smartphone,apple',
    goodsPrice: 7999,
    seckillPrice: 5999,
    stockCount: 34,
    soldCount: 66,
    startDate: past(2),
    endDate: future(2),
    status: 2,
    limitCount: 1,
    totalStock: 100,
  },
  {
    id: 300002,
    goodsId: 200002,
    goodsName: '联想拯救者 Y9000P',
    goodsTitle: '14代酷睿 i9 · RTX 4060 · 2.5K 240Hz 电竞屏',
    goodsImg: 'https://loremflickr.com/400/400/lenovo,gaming,laptop,legion',
    goodsPrice: 9999,
    seckillPrice: 8499,
    stockCount: 18,
    soldCount: 32,
    startDate: past(1),
    endDate: future(4),
    status: 2,
    limitCount: 1,
    totalStock: 50,
  },
  {
    id: 300003,
    goodsId: 200003,
    goodsName: '小米 14 Ultra',
    goodsTitle: '徕卡影像系统 · 骁龙8 Gen3 · 1英寸主摄',
    goodsImg: 'https://loremflickr.com/400/400/xiaomi,ultra,smartphone,leica',
    goodsPrice: 6999,
    seckillPrice: 5499,
    stockCount: 200,
    soldCount: 0,
    startDate: future(24),
    endDate: future(72),
    status: 1,
    limitCount: 1,
    totalStock: 200,
  },
  {
    id: 300004,
    goodsId: 200004,
    goodsName: 'Sony WH-1000XM5',
    goodsTitle: '业界最强降噪 · 30小时续航 · LDAC 高解析',
    goodsImg: 'https://loremflickr.com/400/400/sony,headphones,noise,canceling,wireless',
    goodsPrice: 2499,
    seckillPrice: 1799,
    stockCount: 0,
    soldCount: 80,
    startDate: past(48),
    endDate: past(1),
    status: 3,
    limitCount: 1,
    totalStock: 80,
  },
]

export const mockDashboardStats: DashboardStats = {
  totalOrders: 12847,
  totalRevenue: 8432100,
  activeActivities: 3,
  onlineUsers: 15823,
  ordersGrowth: 12.5,
  revenueGrowth: 8.3,
}

// 生成模拟流量数据
export function generateTrafficData(points = 30): TrafficDataPoint[] {
  const now = new Date()
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(now.getTime() - (points - 1 - i) * 2000)
    const base = 800 + Math.sin(i * 0.5) * 200
    const spike = i === 15 ? 3000 : 0
    const qps = Math.round(base + spike + Math.random() * 100)
    return {
      time: t.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      qps,
      successCount: Math.round(qps * 0.85),
      failCount: Math.round(qps * 0.15),
      p99: Math.round(50 + Math.random() * 30 + (spike > 0 ? 200 : 0)),
    }
  })
}

export const mockOrders: Order[] = [
  {
    id: 'ORD17234567890001',
    userId: 100001,
    goodsId: 200001,
    goodsName: 'Apple iPhone 15 Pro',
    goodsImg: mockGoods[0].goodsImg,
    seckillPrice: 5999,
    quantity: 1,
    totalAmount: 5999,
    status: 0,
    createDate: new Date().toISOString(),
  },
  {
    id: 'ORD17234567890002',
    userId: 100002,
    goodsId: 200002,
    goodsName: '联想拯救者 Y9000P',
    goodsImg: mockGoods[1].goodsImg,
    seckillPrice: 8499,
    quantity: 1,
    totalAmount: 8499,
    status: 1,
    createDate: new Date(Date.now() - 3600000).toISOString(),
    payDate: new Date(Date.now() - 3000000).toISOString(),
  },
]
