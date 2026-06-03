import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession, getCurrentUser } from '../../api/auth'

export default function ProfilePage() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/profile' }, replace: true })
    }
  }, [currentUser, navigate])

  if (!currentUser) return null

  const username = currentUser.username || '-'
  const avatarText = username === '-' ? '用' : username.charAt(0).toUpperCase()
  const userId = currentUser.userId || '-'
  const role = '普通用户'

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <section className="profile-header">
          <div className="page-badge">USER CENTER</div>
          <h1>个人信息</h1>
          <p>查看当前登录账号的基础信息和身份状态。</p>
        </section>

        <section className="profile-card">
          <div className="profile-avatar-area">
            <div className="profile-avatar">{avatarText}</div>
            <h2>{username}</h2>
            <p>{role}</p>
          </div>

          <div className="profile-info-wrap">
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span className="info-label">用户ID</span>
                <strong>{userId}</strong>
              </div>

              <div className="profile-info-item">
                <span className="info-label">用户名</span>
                <strong>{username}</strong>
              </div>

              <div className="profile-info-item">
                <span className="info-label">登录状态</span>
                <strong className="status-success">已登录</strong>
              </div>

              <div className="profile-info-item">
                <span className="info-label">账号类型</span>
                <strong>{role}</strong>
              </div>
            </div>

            <div className="profile-actions">
              <button className="secondary-btn" type="button" onClick={() => navigate('/')}>
                返回秒杀专场
              </button>
              <button className="danger-btn" type="button" onClick={handleLogout}>
                退出登录
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
