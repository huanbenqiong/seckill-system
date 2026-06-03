import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { mockDashboardStats, generateTrafficData } from '../../data/mockData'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { TrafficDataPoint, WsMessage } from '../../types'
import { TrendingUp, TrendingDown, Bot, Send, RefreshCw } from 'lucide-react'

// ===== AI 助手 =====
interface Msg { id: number; role: 'user' | 'ai'; text: string; time: string }

const AI_KB: [string, string][] = [
  ['库存', '📦 iPhone 15 Pro 剩余库存 34 件，已售 66%。建议活动结束前发送补货提醒，预计转化率提升 15%。'],
  ['流量', '📈 当前 QPS ≈ 1,200，P99 延迟 68ms，系统稳定。秒杀高峰期预计突破 5,000 QPS，建议提前扩容网关。'],
  ['订单', '🧾 今日已完成订单 1,284 笔，支付成功率 87.3%，162 笔待支付将在 15 分钟内自动取消。'],
  ['限流', '🛡️ 当前限流：网关层 50 QPS/IP（秒杀接口），全局 1,000 QPS。建议秒杀前调至 200 QPS/IP。'],
  ['预热', '🚀 建议提前 10 分钟调用 POST /api/goods/preload/{id} 预热库存，响应时间可从 200ms 降至 5ms。'],
  ['风控', '⚠️ 今日检测到 23 个 IP 频繁请求（>100次/分钟），已自动封禁。建议开启设备指纹验证。'],
]

function getAiReply(q: string) {
  for (const [k, v] of AI_KB) if (q.includes(k)) return v
  return '我是秒购 AI 助手，您可以询问库存状态、流量分析、风控策略、订单情况等。'
}

// ===== 统计卡片 =====
function MetricCard({ label, value, growth, prefix = '', color }: {
  label: string; value: number; growth: number; prefix?: string; color: string
}) {
  const up = growth >= 0
  const formatted = value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString()
  return (
    <div className="bg-white rounded-2xl p-5 border border-black/6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wider">{label}</span>
        <span className={`text-[12px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${
          up ? 'text-[#30d158] bg-[#30d158]/10' : 'text-[#ff3b30] bg-[#ff3b30]/10'
        }`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}{growth}%
        </span>
      </div>
      <p className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-none">
        {prefix}{formatted}
      </p>
      <div className="mt-3 h-1 bg-[#f5f5f7] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, 40 + Math.abs(growth) * 3)}%`, background: color }} />
      </div>
    </div>
  )
}

// ===== 自定义 Tooltip =====
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-black/6 rounded-xl p-3 text-[12px] shadow-lg">
      <p className="text-[#86868b] mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#6e6e73]">{p.name}:</span>
          <span className="font-semibold text-[#1d1d1f]">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const stats = mockDashboardStats
  const [traffic, setTraffic] = useState<TrafficDataPoint[]>(() => generateTrafficData(24))
  const [msgs, setMsgs] = useState<Msg[]>([{
    id: 1, role: 'ai',
    text: '👋 你好！我是秒购 AI 运营助手。有什么可以帮你的？',
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(2)

  useEffect(() => {
    const t = setInterval(() => {
      setTraffic(prev => [...prev.slice(-23), generateTrafficData(1)[0]])
    }, 2000)
    return () => clearInterval(t)
  }, [])

  useWebSocket({
    url: 'ws://localhost:8080/ws/admin',
    onMessage: useCallback((msg: WsMessage) => {
      if (msg.type === 'TRAFFIC_UPDATE') setTraffic(p => [...p.slice(-23), msg.data as TrafficDataPoint])
    }, []),
  })

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const sendMsg = () => {
    if (!input.trim() || typing) return
    const q = input.trim()
    setMsgs(p => [...p, { id: idRef.current++, role: 'user', text: q, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMsgs(p => [...p, { id: idRef.current++, role: 'ai', text: getAiReply(q), time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }])
      setTyping(false)
    }, 600 + Math.random() * 700)
  }

  const latestQps = traffic.at(-1)?.qps ?? 0
  const latestP99 = traffic.at(-1)?.p99 ?? 0

  return (
    <div className="p-6 space-y-5 anim-fade-in">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">数据总览</h2>
          <p className="text-[13px] text-[#86868b] mt-0.5">实时监控秒杀运营状况</p>
        </div>
        <button className="flex items-center gap-2 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="今日订单" value={stats.totalOrders} growth={stats.ordersGrowth} color="#0066cc" />
        <MetricCard label="今日营收" value={stats.totalRevenue} growth={stats.revenueGrowth} prefix="¥" color="#30d158" />
        <MetricCard label="进行中活动" value={stats.activeActivities} growth={0} color="#ff9f0a" />
        <MetricCard label="在线用户" value={stats.onlineUsers} growth={5.2} color="#6e6e73" />
      </div>

      {/* 主内容：图表 + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左：图表区 */}
        <div className="lg:col-span-2 space-y-5">
          {/* QPS 面积图 */}
          <div className="bg-white rounded-2xl p-5 border border-black/6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f]">实时 QPS</h3>
                <p className="text-[12px] text-[#86868b] mt-0.5">每 2 秒更新</p>
              </div>
              <div className="text-right">
                <p className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-none">{latestQps.toLocaleString()}</p>
                <p className="text-[12px] text-[#86868b] mt-1">当前 QPS · P99 {latestP99}ms</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              {[['总请求', '#0066cc'], ['成功', '#30d158'], ['失败', '#ff3b30']].map(([n, c]) => (
                <div key={n} className="flex items-center gap-1.5 text-[12px] text-[#86868b]">
                  <span className="w-2 h-2 rounded-full" style={{ background: c as string }} />
                  {n}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={traffic} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0066cc" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#0066cc" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#30d158" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#30d158" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="qps" name="总QPS" stroke="#0066cc" strokeWidth={1.5} fill="url(#g1)" dot={false} />
                <Area type="monotone" dataKey="successCount" name="成功" stroke="#30d158" strokeWidth={1.5} fill="url(#g2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* P99 柱状图 */}
          <div className="bg-white rounded-2xl p-5 border border-black/6">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">P99 接口延迟 (ms)</h3>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={traffic.slice(-14)} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#86868b' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="p99" name="P99" fill="#6e6e73" radius={[3, 3, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 系统组件状态 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Gateway', lat: '12ms' },
              { name: 'Redis', lat: '1ms' },
              { name: 'RocketMQ', lat: '4ms' },
            ].map(s => (
              <div key={s.name} className="bg-white rounded-2xl p-4 border border-black/6 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#1d1d1f]">{s.name}</p>
                  <p className="text-[12px] text-[#86868b] mt-0.5">{s.lat}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* 右：AI 助手 */}
        <div
          className="bg-white rounded-2xl border border-black/6 flex flex-col"
          style={{ height: '560px' }}
        >
          {/* 头部 */}
          <div className="flex items-center gap-3 p-4 border-b border-black/6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5856d6,#6e6e73)' }}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1d1d1f]">AI 运营助手</p>
              <p className="text-[11px] text-[#86868b]">智能分析 · 实时建议</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#30d158] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
              在线
            </div>
          </div>

          {/* 快捷指令 */}
          <div className="px-3 pt-3 pb-2 flex gap-1.5 flex-wrap">
            {['库存', '流量', '订单', '风控', '预热'].map(cmd => (
              <button
                key={cmd}
                onClick={() => setInput(cmd)}
                className="text-[11px] font-medium text-[#5856d6] rounded-full px-2.5 py-1 transition-colors"
                style={{ background: 'rgba(88,86,214,0.08)' }}
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {msgs.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5856d6,#6e6e73)' }}>
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#1d1d1f] text-white rounded-tr-md'
                      : 'bg-[#f5f5f7] text-[#1d1d1f] rounded-tl-md'
                  }`}
                >
                  {m.text}
                  <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/40' : 'text-[#86868b]'}`}>{m.time}</p>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5856d6,#6e6e73)' }}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-[#f5f5f7] rounded-2xl rounded-tl-md px-3 py-3 flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#c7c7cc] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 输入 */}
          <div className="p-3 border-t border-black/6">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="问一问 AI 助手…"
                className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2 text-[13px] text-[#1d1d1f] placeholder-[#86868b] outline-none focus:ring-1 focus:ring-[#5856d6]/30 transition-all"
              />
              <button
                onClick={sendMsg}
                disabled={!input.trim() || typing}
                className="p-2 rounded-xl bg-[#1d1d1f] text-white hover:bg-[#3a3a3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
