import { Link } from 'react-router-dom'
import type { SeckillGoods } from '../types'
import { InlineCountdown } from './CountdownTimer'

interface ProductCardProps {
  goods: SeckillGoods
  index?: number
}

const statusLabel: Record<number, string> = {
  0: '已下线',
  1: '即将开始',
  2: '限时抢购',
  3: '已结束',
}

export function ProductCard({ goods, index = 0 }: ProductCardProps) {
  const isSoldOut = goods.stockCount === 0
  const isActive = goods.status === 2

  return (
    <Link
      to={`/product/${goods.id}`}
      className="product-card block anim-fade-up"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* ===== 图片区 ===== */}
      <div className="relative w-full aspect-square bg-[#f5f5f7] overflow-hidden flex items-center justify-center p-8">
        <img
          src={goods.goodsImg}
          alt={goods.goodsName}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          onError={e => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
            const parent = el.parentElement!
            parent.style.background = 'linear-gradient(135deg, #e8e8ed 0%, #d2d2d7 100%)'
            parent.innerHTML = `<span style="font-size:48px;font-weight:700;color:#86868b;letter-spacing:-2px">${goods.goodsName.slice(0,2)}</span>`
          }}
        />

        {/* 状态标签 */}
        <div className="absolute top-4 left-4">
          {isActive && !isSoldOut && (
            <span
              className="flex items-center gap-1.5 text-[11px] font-medium text-white px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {statusLabel[goods.status]}
            </span>
          )}
          {goods.status === 1 && (
            <span
              className="text-[11px] font-medium text-white px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            >
              即将开始
            </span>
          )}
          {isSoldOut && (
            <span
              className="text-[11px] font-medium text-white px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
            >
              已售罄
            </span>
          )}
        </div>
      </div>

      {/* ===== 文字区 ===== */}
      <div className="bg-white px-5 pt-4 pb-5">
        {/* 名称 */}
        <p className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.01em] leading-snug mb-1">
          {goods.goodsName}
        </p>
        {/* 副标题 */}
        <p className="text-[13px] text-[#6e6e73] leading-snug line-clamp-1 mb-3">
          {goods.goodsTitle}
        </p>

        {/* 价格行 */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-semibold text-[#1d1d1f]">
              ¥{goods.seckillPrice.toLocaleString()}
            </span>
            <span className="text-[13px] text-[#86868b] line-through">
              ¥{goods.goodsPrice.toLocaleString()}
            </span>
          </div>

          {/* 倒计时或库存 */}
          {isActive && !isSoldOut && (
            <InlineCountdown targetDate={goods.endDate} />
          )}
          {goods.status === 1 && (
            <span className="text-[12px] text-[#0066cc] font-medium">预约提醒</span>
          )}
        </div>

        {/* 库存（仅剩少量时显示） */}
        {isActive && !isSoldOut && goods.stockCount < 30 && (
          <p className="text-[12px] text-[#ff3b30] mt-2 font-medium">
            仅剩 {goods.stockCount} 件
          </p>
        )}
      </div>
    </Link>
  )
}
