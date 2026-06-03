import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Gift, Lock, Mail, Phone, ShieldCheck, ShoppingBag, UserRound, Zap } from 'lucide-react'
import { login, register, saveSession } from '../../api/auth'

interface FormState {
  username: string
  password: string
  confirmPassword: string
  phone: string
  email: string
}

const initialForm: FormState = {
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  email: '',
}

const features = [
  { title: '账号注册', desc: '快速创建账号', icon: UserRound },
  { title: '限时抢购', desc: '准时开抢不容错过', icon: Zap },
  { title: '订单支付', desc: '安全支付快捷完成', icon: ShieldCheck },
]

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isRegister = location.pathname === '/register'
  const [form, setForm] = useState<FormState>(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = (location.state as { from?: string } | null)?.from || '/'
  const title = isRegister ? '账号注册' : '用户登录'
  const subtitle = isRegister ? '注册后开启您的秒杀之旅' : '登录后开启您的秒杀之旅'

  const passwordHint = useMemo(() => {
    if (!form.password) return ''
    if (form.password.length < 6) return '密码至少需要 6 位'
    if (isRegister && form.confirmPassword && form.password !== form.confirmPassword) {
      return '两次输入的密码不一致'
    }
    return ''
  }, [form.confirmPassword, form.password, isRegister])

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
  }

  const validate = () => {
    if (!form.username.trim()) return '请输入用户名'
    if (form.username.trim().length < 2) return '用户名至少需要 2 个字符'
    if (!form.password) return '请输入密码'
    if (form.password.length < 6) return '密码至少需要 6 位'
    if (isRegister && form.password !== form.confirmPassword) return '两次输入的密码不一致'
    if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) return '请输入正确的手机号'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '请输入正确的邮箱'
    return ''
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = validate()
    if (message) {
      setError(message)
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isRegister) {
        await register({
          username: form.username.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
        })
      }

      const session = await login({
        username: form.username.trim(),
        password: form.password,
      })
      saveSession(session)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="app-shell auth-page">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />
      <div className="auth-wave" />
      <div className="auth-dot-field" />

      <div className="hero-section">
        <div className="hero-left">
          <div className="hero-badge">
            高并发 · 稳定可靠 · 极速体验
          </div>

          <h1 className="hero-title">
            <span>商品库存与秒杀系统</span>
            <span>一次登录，进入完整<span className="orange-highlight">秒杀</span>流程</span>
          </h1>

          <p className="hero-desc">
            登录状态会保存在本地，后续秒杀、订单查询和支付接口都会复用同一份身份信息。
          </p>

          <div className="feature-list">
            {features.map(({ title: itemTitle, desc, icon: Icon }) => (
              <div
                key={itemTitle}
                className="feature-card"
              >
                <span className="feature-icon">
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <span>
                  <strong>{itemTitle}</strong>
                  <small>{desc}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="visual-card" aria-hidden="true">
            <div className="auth-gift-box">
              <Gift size={42} />
            </div>
            <div className="gift-cube">
              <div className="auth-bag-handle" />
              <ShoppingBag className="bag-mark" size={52} strokeWidth={1.35} />
              <Zap className="bag-icon" size={70} fill="currentColor" />
            </div>
            <div className="floating-chip chip-one">%</div>
            <div className="floating-chip chip-two">礼</div>
            <div className="floating-dot dot-one" />
            <div className="floating-dot dot-two" />
            <div className="visual-shadow" />
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <div className="auth-card-icon">
              <ShoppingBag size={24} strokeWidth={1.7} />
            </div>
            <h2 className="auth-title">{title}</h2>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label>用户名</label>
              <div className="input-wrap">
                <UserRound size={18} />
                <input
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </div>
            </div>

            {isRegister && (
              <>
                <div className="form-field">
                  <label>手机号</label>
                  <div className="input-wrap">
                    <Phone size={18} />
                    <input
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder="可选"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>邮箱</label>
                  <div className="input-wrap">
                    <Mail size={18} />
                    <input
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      placeholder="可选"
                      autoComplete="email"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-field">
              <label>密码</label>
              <div className="input-wrap">
                <Lock size={18} />
                <input
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="至少 6 位"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="form-field">
                <label>确认密码</label>
                <div className="input-wrap">
                  <Lock size={18} />
                  <input
                    value={form.confirmPassword}
                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                    placeholder="再次输入密码"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {(error || passwordHint) && (
              <p className="form-error">
                {error || passwordHint}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-submit"
            >
              {loading ? '处理中...' : isRegister ? '注册' : '登录'}
            </button>
          </form>

          <div className="auth-switch">
            <span>{isRegister ? '已有账号？' : '还没有账号？'}</span>
            <Link
              to={isRegister ? '/login' : '/register'}
              state={{ from }}
            >
              {isRegister ? '去登录' : '立即注册'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
