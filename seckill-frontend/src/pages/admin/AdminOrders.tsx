import { useState } from 'react'
import { mockOrders } from '../../data/mockData'
import type { Order } from '../../types'
import { Search } from 'lucide-react'

const statusMap: Record<number, { label: string; style: React.CSSProperties }> = {
  0: { label: '待支付', style: { color: '#ff9f0a', background: 'rgba(255,159,10,0.1)', borderRadius: '980px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 } },
  1: { label: '已支付', style: { color: '#30d158', background: 'rgba(48,209,88,0.1)', borderRadius: '980px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 } },
  2: { label: '已取消', style: { color: '#86868b', background: 'rgba(134,134,139,0.1)', borderRadius: '980px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 } },
  3: { label: '已超时', style: { color: '#ff3b30', background: 'rgba(255,59,48,0.08)', borderRadius: '980px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 } },
}

export default function AdminOrders() {
  const [orders] = useState<Order[]>(mockOrders)
  const [search, setSearch] = useState('')

  const filtered = orders.filter(o =>
    !search || o.id.includes(search) || o.goodsName.includes(search)
  )

  return (
    <div className="p-6 anim-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">订单管理</h2>
          <p className="text-[13px] text-[#86868b] mt-0.5">查看和管理所有秒杀订单</p>
        </div>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '全部订单', count: orders.length },
          { label: '待支付', count: orders.filter(o => o.status === 0).length },
          { label: '已完成', count: orders.filter(o => o.status === 1).length },
          { label: '已取消', count: orders.filter(o => o.status >= 2).length },
        ].map(({ label, count }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-black/6 text-center">
            <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none">{count}</p>
            <p className="text-[12px] text-[#86868b] mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 搜索 */}
      <div className="bg-white rounded-2xl border border-black/6 px-4 py-3 flex items-center gap-3 mb-4">
        <Search className="w-4 h-4 text-[#86868b] flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索订单号或商品名…"
          className="flex-1 text-[13px] text-[#1d1d1f] placeholder-[#86868b] outline-none bg-transparent"
        />
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-2xl border border-black/6 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5">
              {['订单号', '商品', '金额', '状态', '下单时间'].map(h => (
                <th key={h} className="py-3.5 px-5 text-left text-[11px] font-medium text-[#86868b] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/4">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-[14px] text-[#86868b]">暂无订单数据</td>
              </tr>
            ) : filtered.map(o => {
              const { label, style } = statusMap[o.status]
              return (
                <tr key={o.id} className="hover:bg-[#fafafa] transition-colors">
                  <td className="py-4 px-5">
                    <span className="font-mono text-[12px] text-[#86868b]">{o.id.slice(0, 18)}…</span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] overflow-hidden flex-shrink-0">
                        <img src={o.goodsImg} alt={o.goodsName} className="w-full h-full object-contain p-1"
                          onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                      </div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{o.goodsName}</p>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">¥{o.totalAmount.toLocaleString()}</p>
                  </td>
                  <td className="py-4 px-5">
                    <span style={style}>{label}</span>
                  </td>
                  <td className="py-4 px-5 text-[12px] text-[#86868b]">
                    {new Date(o.createDate).toLocaleString('zh-CN')}
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
