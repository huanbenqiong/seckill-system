import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { mockGoods } from '../../data/mockData'
import { ProductCard } from '../../components/ProductCard'
import { CountdownTimer } from '../../components/CountdownTimer'
import type { SeckillGoods } from '../../types'

export default function HomePage() {
  const [featured, setFeatured] = useState<SeckillGoods | null>(null)
  const [others, setOthers] = useState<SeckillGoods[]>([])
  const [heroLoaded, setHeroLoaded] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 挑选进行中的作为主推，其他的作为列表
    const active = mockGoods.find(g => g.status === 2) || mockGoods[0]
    setFeatured(active)
    setOthers(mockGoods.filter(g => g.id !== active.id))
    // Hero 加载动画
    const t = setTimeout(() => setHeroLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (!featured) return null

  const saving = featured.goodsPrice - featured.seckillPrice

  return (
    <>
      {/* ============================================================
          英雄区 - 深色全屏，Apple 发布会风格
      ============================================================ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)' }}
      >
        {/* 微妙背景光 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)',
          }}
        />

        {/* 内容 */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-28 pb-20 flex flex-col items-center text-center">

          {/* 顶部徽章 */}
          <div
            className={`transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <span
              className="inline-flex items-center gap-2 text-[13px] font-medium text-white/70 mb-8"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '980px',
                padding: '6px 16px',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              限时特惠 · 正在进行中
            </span>
          </div>

          {/* 主标题 */}
          <h1
            className={`display text-white mb-3 transition-all duration-700 delay-100 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            {featured.goodsName}
          </h1>

          {/* 副标题 */}
          <p
            className={`text-[19px] text-white/50 font-normal leading-relaxed max-w-xl mb-10 transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            {featured.goodsTitle}
          </p>

          {/* 商品图片 */}
          <div
            className={`relative w-full max-w-sm mx-auto mb-10 transition-all duration-1000 delay-300 ${heroLoaded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
          >
            <img
              src={featured.goodsImg}
              alt={featured.goodsName}
              className="w-full h-auto object-contain drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.6))' }}
              onError={e => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
              }}
            />
          </div>

          {/* 价格 + 倒计时 */}
          <div
            className={`flex flex-col sm:flex-row items-center gap-8 mb-10 transition-all duration-700 delay-400 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            {/* 价格 */}
            <div className="text-center">
              <p className="text-[13px] text-white/40 mb-1 font-normal">秒杀价</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[42px] font-semibold text-white tracking-tight leading-none">
                  ¥{featured.seckillPrice.toLocaleString()}
                </span>
                <div className="flex flex-col items-start">
                  <span className="text-[15px] text-white/30 line-through">
                    ¥{featured.goodsPrice.toLocaleString()}
                  </span>
                  <span className="text-[12px] text-[#30d158] font-medium">
                    节省 ¥{saving.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 分隔线 */}
            <div className="hidden sm:block w-px h-16 bg-white/10" />

            {/* 倒计时 */}
            <CountdownTimer
              targetDate={featured.endDate}
              theme="dark"
              size="md"
              showLabel
            />
          </div>

          {/* CTA 按钮 */}
          <div
            className={`flex items-center gap-4 transition-all duration-700 delay-500 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <Link to={`/product/${featured.id}`}>
              <button className="btn-dark text-[15px] px-8 py-3.5">
                立即抢购
              </button>
            </Link>
            <Link to={`/product/${featured.id}`}>
              <button className="btn-outline text-[15px] px-8 py-3.5">
                了解详情
              </button>
            </Link>
          </div>

          {/* 库存提示 */}
          {featured.stockCount < 50 && (
            <p
              className={`mt-6 text-[13px] text-white/30 transition-all duration-700 delay-600 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
            >
              仅剩 {featured.stockCount} 件 · 先到先得
            </p>
          )}
        </div>

        {/* 向下滚动指示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-[11px] text-white/50 font-medium tracking-widest uppercase">Scroll</span>
          <div className="w-px h-10 bg-white/30" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ============================================================
          其他商品 - 浅灰底色，Apple 产品网格
      ============================================================ */}
      <section className="bg-[#f5f5f7] py-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* 标题 */}
          <div className="text-center mb-16 anim-fade-up">
            <h2 className="headline text-[#1d1d1f] mb-4">更多秒杀</h2>
            <p className="text-[17px] text-[#6e6e73] font-normal">精选优质产品，限时特惠价格</p>
          </div>

          {/* 产品网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {others.map((g, i) => (
              <ProductCard key={g.id} goods={g} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          平台优势 - Apple 风格三栏
      ============================================================ */}
      <section className="bg-white py-24 border-t border-black/6">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: '⚡',
                title: '极速响应',
                desc: '接口响应时间小于 10ms，Redis Lua 原子扣减库存，万级并发不超卖。',
              },
              {
                icon: '🔐',
                title: '安全可信',
                desc: '四层防超卖机制：Redis 预扣减 → 分布式锁 → 数据库唯一索引，层层保障。',
              },
              {
                icon: '🚀',
                title: '异步解耦',
                desc: 'RocketMQ 消息队列异步创建订单，削峰填谷，秒杀接口零等待立即响应。',
              },
            ].map(({ icon, title, desc }, i) => (
              <div key={title} className={`anim-fade-up d-${(i + 1) * 100}`}>
                <span className="text-4xl">{icon}</span>
                <h3 className="text-[19px] font-semibold text-[#1d1d1f] mt-4 mb-2 tracking-tight">{title}</h3>
                <p className="text-[15px] text-[#6e6e73] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
