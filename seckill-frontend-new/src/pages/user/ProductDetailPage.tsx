import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { mockGoods } from '../../data/mockData'
import { CountdownTimer } from '../../components/CountdownTimer'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { SeckillGoods, WsMessage, StockUpdateData } from '../../types'
import { ChevronLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

type SeckillState = 'idle' | 'loading' | 'success' | 'error' | 'soldout'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [goods, setGoods] = useState<SeckillGoods | null>(null)
  const [seckillState, setSeckillState] = useState<SeckillState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [stockCount, setStockCount] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)

  useWebSocket({
    url: `ws://localhost:8080/ws/seckill/${id}`,
    onMessage: useCallback((msg: WsMessage) => {
      if (msg.type === 'STOCK_UPDATE') {
        const d = msg.data as StockUpdateData
        if (d.goodsId === Number(id)) setStockCount(d.remainingStock)
      }
    }, [id]),
  })

  useEffect(() => {
    const found = mockGoods.find(g => g.id === Number(id))
    if (found) { setGoods(found); setStockCount(found.stockCount) }
  }, [id])

  const handleSeckill = async () => {
    if (!goods || seckillState === 'loading') return
    if (stockCount <= 0) { setSeckillState('soldout'); return }
    setSeckillState('loading')
    await new Promise(r => setTimeout(r, 1400))
    const success = Math.random() > 0.25
    if (success) {
      setSeckillState('success')
      setStockCount(p => Math.max(0, p - 1))
      setTimeout(() => {
        navigate('/order/result', { state: { orderId: `ORD${Date.now()}`, goods } })
      }, 1600)
    } else {
      setSeckillState('error')
      setErrorMsg('手速不够快，被别人抢先了')
      setTimeout(() => setSeckillState('idle'), 3500)
    }
  }

  if (!goods) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#86868b] animate-spin" />
      </div>
    )
  }

  const isActive = goods.status === 2
  const isSoldOut = stockCount === 0
  const saving = goods.goodsPrice - goods.seckillPrice
  const savingPct = Math.round((saving / goods.goodsPrice) * 100)

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部间距 (因为固定导航) */}
      <div className="h-[52px]" />

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* 面包屑 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[#0066cc] text-[13px] mb-10 hover:opacity-70 transition-opacity group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          返回
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
          {/* ===== 左：商品图 ===== */}
          <div className="anim-fade-in">
            <div
              className="rounded-3xl overflow-hidden aspect-square flex items-center justify-center p-10"
              style={{ background: '#f5f5f7' }}
            >
              <img
                src={goods.goodsImg}
                alt={goods.goodsName}
                className={`w-full h-full object-contain transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onLoad={() => setImgLoaded(true)}
                onError={e => {
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  setImgLoaded(true)
                }}
              />
            </div>

            {/* 保障信息 */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {['正品保证', '极速发货', '七日无忧'].map(t => (
                <div key={t} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#f5f5f7]">
                  <span className="text-[20px]">
                    {t === '正品保证' ? '✓' : t === '极速发货' ? '⚡' : '↩'}
                  </span>
                  <span className="text-[12px] text-[#6e6e73] font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ===== 右：商品信息 ===== */}
          <div className="anim-fade-up flex flex-col justify-center">
            {/* 状态 */}
            {isActive && (
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[13px] font-medium text-[#ff3b30]">限时特惠 · 正在进行中</span>
              </div>
            )}
            {goods.status === 1 && (
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-[#0066cc]" />
                <span className="text-[13px] font-medium text-[#0066cc]">即将开始</span>
              </div>
            )}

            {/* 商品名 */}
            <h1 className="title-lg text-[#1d1d1f] mb-2">{goods.goodsName}</h1>
            <p className="text-[17px] text-[#6e6e73] leading-relaxed mb-8">{goods.goodsTitle}</p>

            {/* 分割线 */}
            <div className="h-px bg-black/6 mb-8" />

            {/* 价格区 */}
            <div className="mb-8">
              <p className="text-[13px] text-[#86868b] mb-2">秒杀价</p>
              <div className="flex items-baseline gap-4">
                <span className="text-[44px] font-semibold text-[#1d1d1f] leading-none tracking-tight">
                  ¥{goods.seckillPrice.toLocaleString()}
                </span>
                <div>
                  <span className="text-[17px] text-[#86868b] line-through block">
                    ¥{goods.goodsPrice.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-[#30d158] font-medium">
                    节省 ¥{saving.toLocaleString()}（{savingPct}% off）
                  </span>
                </div>
              </div>
            </div>

            {/* 倒计时 */}
            {isActive && !isSoldOut && (
              <div className="mb-8">
                <CountdownTimer targetDate={goods.endDate} theme="light" size="md" showLabel />
              </div>
            )}

            {/* 库存 */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#86868b]">库存状态</span>
                {isSoldOut
                  ? <span className="text-[#ff3b30] font-medium">已售罄</span>
                  : stockCount < 20
                  ? <span className="text-[#ff3b30] font-medium">仅剩 {stockCount} 件</span>
                  : <span className="text-[#30d158] font-medium">有货</span>
                }
              </div>
            </div>

            {/* 错误提示 */}
            {seckillState === 'error' && (
              <div
                className="mb-5 px-4 py-3 rounded-2xl text-[14px] text-[#ff3b30]"
                style={{ background: 'rgba(255,59,48,0.06)' }}
              >
                {errorMsg}
              </div>
            )}

            {/* 秒杀按钮 */}
            <button
              onClick={handleSeckill}
              disabled={!isActive || isSoldOut || seckillState === 'loading' || seckillState === 'success'}
              className={`w-full py-4 rounded-2xl text-[17px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isActive && !isSoldOut && seckillState !== 'success'
                  ? 'bg-[#1d1d1f] text-white hover:bg-[#3a3a3c] active:scale-[0.98]'
                  : 'bg-[#f5f5f7] text-[#86868b] cursor-not-allowed'
              }`}
            >
              {seckillState === 'loading' ? (
                <><Loader2 className="w-5 h-5 animate-spin" />处理中...</>
              ) : seckillState === 'success' ? (
                <><CheckCircle className="w-5 h-5" />抢购成功！</>
              ) : isSoldOut ? (
                '已售罄'
              ) : !isActive ? (
                goods.status === 1 ? '活动尚未开始' : '活动已结束'
              ) : (
                <>立即抢购<ArrowRight className="w-5 h-5" /></>
              )}
            </button>

            {/* 限购说明 */}
            <p className="text-center text-[12px] text-[#86868b] mt-4">
              每人限购 {goods.limitCount} 件 · 仅限新老用户
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
