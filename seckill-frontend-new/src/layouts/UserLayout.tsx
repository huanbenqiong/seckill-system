import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'

export default function UserLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [isDarkHero, setIsDarkHero] = useState(true)

  // 检测滚动，调整导航栏样式
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
      // 首页时，在英雄区显示深色导航，滚动后切白色
      if (location.pathname === '/') {
        setIsDarkHero(window.scrollY < window.innerHeight * 0.7)
      } else {
        setIsDarkHero(false)
      }
    }
    setIsDarkHero(location.pathname === '/')
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  const dark = isDarkHero && !scrolled

  return (
    <div className="min-h-screen bg-white">
      {/* ===== 导航栏 ===== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          dark ? 'glass-nav-dark' : 'glass-nav'
        } ${scrolled ? 'shadow-sm' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-[52px] grid grid-cols-3 items-center">
          {/* 左：Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <svg
                width="20" height="20" viewBox="0 0 20 20" fill="none"
                className={`transition-colors ${dark ? 'text-white' : 'text-[#1d1d1f]'}`}
              >
                <path
                  d="M10 2L12.5 7H17.5L13.5 10.5L15 15.5L10 12.5L5 15.5L6.5 10.5L2.5 7H7.5L10 2Z"
                  fill="currentColor"
                />
              </svg>
              <span className={`text-[15px] font-semibold tracking-[-0.01em] transition-colors ${dark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                秒购
              </span>
            </Link>
          </div>

          {/* 中：导航链接 */}
          <nav className="flex items-center justify-center gap-8">
            {[
              { to: '/', label: '秒杀专场' },
              { to: '/product/300001', label: '限定发售' },
              { to: '/admin', label: '商家后台' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-[13px] font-normal transition-colors hover:opacity-70 ${
                  dark ? 'text-white/90' : 'text-[#1d1d1f]'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* 右：登录 */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => navigate('/admin')}
              className={`text-[13px] font-normal transition-colors hover:opacity-70 ${
                dark ? 'text-white/90' : 'text-[#1d1d1f]'
              }`}
            >
              登录
            </button>
          </div>
        </div>
      </header>

      {/* 页面内容 */}
      <main>
        <Outlet />
      </main>

      {/* 底部 */}
      <footer className="border-t border-black/6 py-10 mt-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[#86868b]">Copyright © 2024 秒购</p>
            <div className="flex items-center gap-6">
              {['隐私政策', '使用条款', '联系我们'].map(t => (
                <a key={t} href="#" className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors">
                  {t}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
