import { useState, type FormEvent } from 'react'
import { Plus, X, MoreHorizontal } from 'lucide-react'
import { useGoods } from '../../context/GoodsContext'
import type { SeckillGoods } from '../../types'

const statusMap: Record<number, { label: string; dot: string; text: string }> = {
  0: { label: '已下线', dot: '#86868b', text: '#86868b' },
  1: { label: '准备中', dot: '#0066cc', text: '#0066cc' },
  2: { label: '进行中', dot: '#30d158', text: '#30d158' },
  3: { label: '已结束', dot: '#c7c7cc', text: '#86868b' },
}

const EMPTY_FORM = {
  goodsName: '',
  goodsTitle: '',
  goodsImg: '',
  goodsPrice: '',
  seckillPrice: '',
  stockCount: '',
  limitCount: '1',
  startDate: '',
  endDate: '',
}

function computeStatus(start: string, end: string): 0 | 1 | 2 | 3 {
  const now = Date.now()
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (s > now) return 1
  if (e < now) return 3
  return 2
}

// ── 发布弹窗表单 ──────────────────────────────────────────────
function PublishModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (g: SeckillGoods) => void }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({})

  function set(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {}
    if (!form.goodsName.trim()) e.goodsName = '请填写商品名称'
    if (!form.goodsPrice || Number(form.goodsPrice) <= 0) e.goodsPrice = '请填写有效原价'
    if (!form.seckillPrice || Number(form.seckillPrice) <= 0) e.seckillPrice = '请填写有效秒杀价'
    if (Number(form.seckillPrice) >= Number(form.goodsPrice)) e.seckillPrice = '秒杀价须低于原价'
    if (!form.stockCount || Number(form.stockCount) <= 0) e.stockCount = '请填写库存数量'
    if (!form.startDate) e.startDate = '请选择开始时间'
    if (!form.endDate) e.endDate = '请选择结束时间'
    if (form.startDate && form.endDate && form.startDate >= form.endDate) e.endDate = '结束时间须晚于开始时间'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const stock = parseInt(form.stockCount)
    const keyword = encodeURIComponent(form.goodsName.slice(0, 12).replace(/\s+/g, ','))
    const newGoods: SeckillGoods = {
      id: Date.now(),
      goodsId: Date.now() + 1,
      goodsName: form.goodsName.trim(),
      goodsTitle: form.goodsTitle.trim(),
      goodsImg: form.goodsImg.trim() || `https://loremflickr.com/400/400/${keyword}`,
      goodsPrice: parseFloat(form.goodsPrice),
      seckillPrice: parseFloat(form.seckillPrice),
      stockCount: stock,
      soldCount: 0,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      status: computeStatus(form.startDate, form.endDate),
      limitCount: parseInt(form.limitCount) || 1,
      totalStock: stock,
    }
    onSubmit(newGoods)
  }

  const Field = ({
    label,
    required,
    children,
    error,
  }: {
    label: string
    required?: boolean
    children: React.ReactNode
    error?: string
  }) => (
    <div>
      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
        {label}{required && <span className="text-[#ff3b30] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-[#ff3b30] mt-1">{error}</p>}
    </div>
  )

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 rounded-xl border text-[14px] text-[#1d1d1f] outline-none transition-colors ${
      err ? 'border-[#ff3b30] bg-[#fff5f5]' : 'border-black/10 bg-[#f5f5f7] focus:border-[#0066cc] focus:bg-white'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-black/6 sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <h3 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight">发布新活动</h3>
            <p className="text-[13px] text-[#86868b] mt-0.5">填写商品信息，保存后立即在用户端展示</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f7] text-[#86868b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {/* 商品名称（最重要，单独一行大一些） */}
          <Field label="商品名称" required error={errors.goodsName}>
            <input
              className={inputCls(errors.goodsName) + ' text-[15px] font-medium'}
              placeholder="例：Apple iPhone 15 Pro 256GB 深空黑"
              value={form.goodsName}
              onChange={e => set('goodsName', e.target.value)}
            />
          </Field>

          <Field label="商品副标题" error={errors.goodsTitle}>
            <input
              className={inputCls()}
              placeholder="例：A17 Pro 芯片 · 钛金属机身 · 超视网膜屏"
              value={form.goodsTitle}
              onChange={e => set('goodsTitle', e.target.value)}
            />
          </Field>

          <Field label="商品图片 URL" error={errors.goodsImg}>
            <input
              className={inputCls()}
              placeholder="留空则自动匹配商品关键词图片"
              value={form.goodsImg}
              onChange={e => set('goodsImg', e.target.value)}
            />
          </Field>

          {/* 价格一行两列 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="原价（元）" required error={errors.goodsPrice}>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls(errors.goodsPrice)}
                placeholder="0.00"
                value={form.goodsPrice}
                onChange={e => set('goodsPrice', e.target.value)}
              />
            </Field>
            <Field label="秒杀价（元）" required error={errors.seckillPrice}>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls(errors.seckillPrice)}
                placeholder="0.00"
                value={form.seckillPrice}
                onChange={e => set('seckillPrice', e.target.value)}
              />
            </Field>
          </div>

          {/* 库存+限购一行两列 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="库存数量" required error={errors.stockCount}>
              <input
                type="number"
                min="1"
                className={inputCls(errors.stockCount)}
                placeholder="100"
                value={form.stockCount}
                onChange={e => set('stockCount', e.target.value)}
              />
            </Field>
            <Field label="限购数量（件/人）" error={errors.limitCount}>
              <input
                type="number"
                min="1"
                className={inputCls()}
                placeholder="1"
                value={form.limitCount}
                onChange={e => set('limitCount', e.target.value)}
              />
            </Field>
          </div>

          {/* 时间一行两列 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="活动开始时间" required error={errors.startDate}>
              <input
                type="datetime-local"
                className={inputCls(errors.startDate)}
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </Field>
            <Field label="活动结束时间" required error={errors.endDate}>
              <input
                type="datetime-local"
                className={inputCls(errors.endDate)}
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
              />
            </Field>
          </div>

          {/* 底部按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-black/10 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-[#1d1d1f] text-white text-[14px] font-medium hover:bg-[#2d2d2f] transition-colors"
            >
              发布活动
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────
export default function AdminProducts() {
  const { goods, addGoods } = useGoods()
  const [showModal, setShowModal] = useState(false)

  function handlePublish(g: SeckillGoods) {
    addGoods(g)
    setShowModal(false)
  }

  return (
    <div className="p-6 anim-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">商品管理</h2>
          <p className="text-[13px] text-[#86868b] mt-0.5">管理当前所有秒杀活动</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-dark text-[13px] px-4 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新增活动
        </button>
      </div>

      {/* 概览数字 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '全部',   count: goods.length },
          { label: '进行中', count: goods.filter(g => g.status === 2).length },
          { label: '准备中', count: goods.filter(g => g.status === 1).length },
          { label: '已结束', count: goods.filter(g => g.status === 3).length },
        ].map(({ label, count }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-black/6 text-center">
            <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none">{count}</p>
            <p className="text-[12px] text-[#86868b] mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5">
              <th className="py-3.5 px-5 text-left text-[11px] font-medium text-[#86868b] uppercase tracking-wider">商品</th>
              <th className="py-3.5 px-5 text-left text-[11px] font-medium text-[#86868b] uppercase tracking-wider">秒杀价</th>
              <th className="py-3.5 px-5 text-left text-[11px] font-medium text-[#86868b] uppercase tracking-wider">库存</th>
              <th className="py-3.5 px-5 text-left text-[11px] font-medium text-[#86868b] uppercase tracking-wider">状态</th>
              <th className="py-3.5 px-5 text-left text-[11px] font-medium text-[#86868b] uppercase tracking-wider">活动时间</th>
              <th className="py-3.5 px-5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/4">
            {goods.map(g => {
              const { label, dot, text } = statusMap[g.status]
              return (
                <tr key={g.id} className="hover:bg-[#fafafa] transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img
                          src={g.goodsImg}
                          alt={g.goodsName}
                          className="w-full h-full object-contain p-1"
                          onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
                        />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{g.goodsName}</p>
                        <p className="text-[12px] text-[#86868b] mt-0.5 line-clamp-1 max-w-52">{g.goodsTitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">¥{g.seckillPrice.toLocaleString()}</p>
                    <p className="text-[12px] text-[#86868b] line-through">¥{g.goodsPrice.toLocaleString()}</p>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-[14px] text-[#1d1d1f] font-medium">{g.stockCount}</p>
                    <p className="text-[12px] text-[#86868b]">已售 {g.soldCount}</p>
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: text }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: dot, ...(g.status === 2 ? { animation: 'pulse 2s ease-in-out infinite' } : {}) }}
                      />
                      {label}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-[12px] text-[#86868b]">
                    <p>{new Date(g.startDate).toLocaleDateString('zh-CN')}</p>
                    <p>{new Date(g.endDate).toLocaleDateString('zh-CN')}</p>
                  </td>
                  <td className="py-4 px-5">
                    <button className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f] transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 发布弹窗 */}
      {showModal && (
        <PublishModal onClose={() => setShowModal(false)} onSubmit={handlePublish} />
      )}
    </div>
  )
}
