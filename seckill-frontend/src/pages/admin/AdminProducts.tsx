import { useState } from 'react'
import { mockGoods } from '../../data/mockData'
import type { SeckillGoods } from '../../types'
import { Plus, MoreHorizontal } from 'lucide-react'

const statusMap: Record<number, { label: string; dot: string; text: string }> = {
  0: { label: '已下线', dot: '#86868b', text: '#86868b' },
  1: { label: '准备中', dot: '#0066cc', text: '#0066cc' },
  2: { label: '进行中', dot: '#30d158', text: '#30d158' },
  3: { label: '已结束', dot: '#c7c7cc', text: '#86868b' },
}

export default function AdminProducts() {
  const [goods] = useState<SeckillGoods[]>(mockGoods)

  return (
    <div className="p-6 anim-fade-in">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">商品管理</h2>
          <p className="text-[13px] text-[#86868b] mt-0.5">管理当前所有秒杀活动</p>
        </div>
        <button className="btn-dark text-[13px] px-4 py-2.5 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增活动
        </button>
      </div>

      {/* 概览数字 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '全部', count: goods.length },
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
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot, ...(g.status === 2 ? { animation: 'pulse 2s ease-in-out infinite' } : {}) }} />
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
    </div>
  )
}
