import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/user/login' : '/user/register';
      const res: any = await request.post(endpoint, {
        username: username.trim(),
        password,
        role,
      });

      if (res && res.code === 200) {
        const data = res.data;
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', String(data.role));
        localStorage.setItem('shopName', data.shopName || '');

        if (data.role === 1) {
          navigate('/seller');
        } else {
          navigate('/goods');
        }
      } else {
        setError(res?.message || (isLogin ? '登录失败' : '注册失败'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-container">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="logo-icon">⚡</span>
          <h1>闪购秒杀</h1>
          <p>限时抢购，实惠好货</p>
        </div>

        {/* Tab: 登录 / 注册 */}
        <div style={{ display: 'flex', background: '#f5f7fa', borderRadius: 30, padding: 4, marginBottom: 24 }}>
          {(['登录', '注册'] as const).map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => { setIsLogin(idx === 0); setError(''); }}
              style={{
                flex: 1,
                padding: '9px',
                border: 'none',
                borderRadius: 26,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.22s',
                background: (idx === 0) === isLogin ? 'white' : 'transparent',
                color: (idx === 0) === isLogin ? '#667eea' : '#a0aec0',
                boxShadow: (idx === 0) === isLogin ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* 角色选择 */}
          <div className="role-selector">
            <div
              className={`role-option${role === 0 ? ' active' : ''}`}
              onClick={() => setRole(0)}
            >
              <span className="role-icon">🛒</span>
              <span className="role-name">我是买家</span>
            </div>
            <div
              className={`role-option${role === 1 ? ' active' : ''}`}
              onClick={() => setRole(1)}
            >
              <span className="role-icon">🏪</span>
              <span className="role-name">我是商家</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={role === 1 ? '请输入商家用户名' : '请输入用户名'}
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">确认密码</label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="error-text">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary full-width btn-lg"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                处理中...
              </>
            ) : isLogin ? '登 录' : '注 册'}
          </button>
        </form>

        <div className="toggle-mode">
          {isLogin ? (
            <p>还没有账号？
              <button type="button" className="link-btn" onClick={() => { setIsLogin(false); setError(''); }}>
                立即注册
              </button>
            </p>
          ) : (
            <p>已有账号？
              <button type="button" className="link-btn" onClick={() => { setIsLogin(true); setError(''); }}>
                立即登录
              </button>
            </p>
          )}
        </div>

        <div style={{ marginTop: 20, padding: '12px 14px', background: '#fafafa', borderRadius: 8, fontSize: 12, color: '#999', textAlign: 'center' }}>
          <p>测试账号：test / 123456 &nbsp;|&nbsp; 或注册新账号体验</p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
