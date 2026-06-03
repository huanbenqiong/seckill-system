import { useLocation, Link, useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronLeft, ArrowRight } from 'lucide-react'
import { useCountdown } from '../../hooks/useCountdown'
import type { SeckillGoods } from '../../types'

export default function OrderResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { orderId, goods } = (location.state || {}) as { orderId?: string; goods?: SeckillGoods }

  const payExpire = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const { minutes, seconds, isEnded } = useCountdown({
    targetDate: payExpire,
    onEnd: () => navigate('/'),
  })

  if (!orderId || !goods) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5">
        <p className="text-[17px] text-[#6e6e73]">页面访问异常</p>
        <Link to="/" className="text-[#0066cc] text-[15px] hover:opacity-70">返回首页</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="h-[52px]" />
      <div className="max-w-lg mx-auto px-6 py-16 anim-fade-up">

        {/* ===== 成功图标 ===== */}
        <div className="flex flex-col items-center text-center mb-12">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'rgba(48,209,88,0.1)' }}
          >
            <CheckCircle className="w-10 h-10 text-[#30d158]" strokeWidth={1.5} />
          </div>
          <h1 className="headline text-[#1d1d1f] mb-2">抢购成功</h1>
          <p className="text-[15px] text-[#6e6e73]">请在支付有效期内完成支付，超时订单自动取消</p>
        </div>

        {/* ===== 订单卡片 ===== */}
        <div
          className="rounded-3xl overflow-hidden mb-6"
          style={{ background: '#f5f5f7' }}
        >
          {/* 商品 */}
          <div className="flex items-center gap-4 p-6 border-b border-black/6">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={goods.goodsImg}
                alt={goods.goodsName}
                className="w-full h-full object-contain p-1"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[#1d1d1f] truncate">{goods.goodsName}</p>
              <p className="text-[13px] text-[#86868b] mt-0.5">限时秒杀 · 数量 ×1</p>
            </div>
            <span className="text-[17px] font-semibold text-[#1d1d1f]">
              ¥{goods.seckillPrice.toLocaleString()}
            </span>
          </div>

          {/* 订单信息 */}
          <div className="p-6 space-y-3">
            {[
              { label: '订单编号', value: orderId, mono: true },
              { label: '创建时间', value: new Date().toLocaleString('zh-CN'), mono: false },
              { label: '订单状态', value: '待支付', mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[13px] text-[#86868b]">{label}</span>
                <span className={`text-[13px] text-[#1d1d1f] ${mono ? 'font-mono' : 'font-medium'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* 支付倒计时 */}
          <div className="mx-6 mb-6 p-4 rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[#86868b]">支付剩余时间</p>
              <span
                className={`text-[22px] font-semibold tabular-nums tracking-tight ${
                  isEnded ? 'text-[#ff3b30]' : minutes < 5 ? 'text-[#ff9f0a]' : 'text-[#1d1d1f]'
                }`}
              >
                {String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
              </span>
            </div>
          </div>
        </div>

        {/* ===== 操作按钮 ===== */}
        <button
          className="btn-dark w-full py-4 text-[17px] mb-3 justify-center"
          onClick={() => alert('支付功能集成中…')}
        >
          立即支付 ¥{goods.seckillPrice.toLocaleString()}
          <ArrowRight className="w-5 h-5" />
        </button>

        <Link to="/">
          <button className="btn-light w-full py-4 text-[15px] justify-center">
            <ChevronLeft className="w-4 h-4" />
            继续逛逛
          </button>
        </Link>

        {/* 说明 */}
        <p className="text-center text-[12px] text-[#86868b] mt-6 leading-relaxed">
          超时未支付订单将自动取消并释放库存<br />
          如有问题请联系客服
        </p>
      </div>
    </div>
  )
}
