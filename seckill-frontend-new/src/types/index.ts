// ======= 商品相关 =======
export interface SeckillGoods {
  id: number
  goodsId: number
  goodsName: string
  goodsTitle: string
  goodsImg: string
  goodsPrice: number
  seckillPrice: number
  stockCount: number
  soldCount: number
  startDate: string
  endDate: string
  status: 0 | 1 | 2 | 3  // 0-已下线 1-准备中 2-进行中 3-已结束
  limitCount: number
  totalStock: number       // 初始库存，用于计算进度
}

// ======= 订单相关 =======
export interface Order {
  id: string
  userId: number
  goodsId: number
  goodsName: string
  goodsImg: string
  seckillPrice: number
  quantity: number
  totalAmount: number
  status: 0 | 1 | 2 | 3  // 0-待支付 1-已支付 2-已取消 3-已超时
  createDate: string
  payDate?: string
}

// ======= WebSocket 消息 =======
export type WsMessageType = 
  | 'STOCK_UPDATE'       // 库存更新
  | 'SECKILL_RESULT'     // 秒杀结果
  | 'TRAFFIC_UPDATE'     // 流量数据（管理端）
  | 'ORDER_STATUS'       // 订单状态变更
  | 'SYSTEM_NOTICE'      // 系统通知

export interface WsMessage<T = unknown> {
  type: WsMessageType
  data: T
  timestamp: number
}

export interface StockUpdateData {
  goodsId: number
  remainingStock: number
  soldCount: number
}

export interface SeckillResultData {
  success: boolean
  orderId?: string
  message: string
}

export interface TrafficDataPoint {
  time: string
  qps: number
  successCount: number
  failCount: number
  p99: number
}

// ======= 管理端统计 =======
export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  activeActivities: number
  onlineUsers: number
  ordersGrowth: number
  revenueGrowth: number
}

// ======= API 响应 =======
export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}
