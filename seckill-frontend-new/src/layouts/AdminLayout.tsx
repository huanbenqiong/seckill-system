import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Settings, ChevronRight } from 'lucide-react'

const navItems = [
  { path: '/admin', label: '数据总览', icon: LayoutDashboard, exact: true },
  { path: '/admin/products', label: '商品管理', icon: Package },
  { path: '/admin/orders', label: '订单管理', icon: ShoppingCart },
]

export default function AdminLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex">
      {/* ===== 侧边栏 ===== */}
      <aside className="w-[220px] bg-white border-r border-black/6 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-[60px] px-5 flex items-center border-b border-black/6">
          <div>
            <p className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">秒购后台</p>
            <p className="text-[11px] text-[#86868b] mt-0.5">管理控制台</p>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map(({ path, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-[#f5f5f7] text-[#1d1d1f]'
                    : 'text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`} />
                {label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#c7c7cc]" />}
              </Link>
            )
          })}
        </nav>

        {/* 底部 */}
        <div className="p-3 border-t border-black/6">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors">
            <Settings className="w-4 h-4 text-[#86868b]" />
            系统设置
          </button>
        </div>
      </aside>

      {/* ===== 主内容 ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-[60px] bg-white border-b border-black/6 flex items-center px-6 justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
            <span>管理后台</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1d1d1f] font-medium">
              {navItems.find(n => n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path))?.label || '总览'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-[#30d158] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
              系统正常
            </div>
            <div className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[12px] font-semibold text-[#6e6e73]">
              A
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
