import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(0); // 0-买家, 1-卖家
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        const res: any = await request.post('/user/login', { 
          username: username.trim(), 
          password,
          role: role
        });
        
        if (res && res.code === 200) {
          const data = res.data;
          // 存储用户信息
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('username', data.username);
          localStorage.setItem('role', data.role);
          localStorage.setItem('shopName', data.shopName || '');
          
          console.log('登录成功:', data);
          
          // 根据角色跳转到不同页面
          if (data.role === 1) {
            alert('商家登录成功！');
            navigate('/seller');
          } else {
            alert('登录成功！');
            navigate('/goods');
          }
        } else {
          setError(res?.message || '登录失败');
        }
      } else {
        // 注册
        if (password !== confirmPassword) {
          setError('两次密码输入不一致');
          setLoading(false);
          return;
        }
        
        const res: any = await request.post('/user/register', { 
          username: username.trim(), 
          password,
          role: role
        });
        
        if (res && res.code === 200) {
          const data = res.data;
          // 注册成功后自动登录
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('username', data.username);
          localStorage.setItem('role', data.role);
          
          console.log('注册成功:', data);
          alert('注册成功！');
          
          if (data.role === 1) {
            navigate('/seller');
          } else {
            navigate('/goods');
          }
        } else {
          setError(res?.message || '注册失败');
        }
      }
    } catch (err: any) {
      console.error('请求失败:', err);
      setError(err.response?.data?.message || '请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="container center-container">
      <div className="card login-card">
        <h2>{isLogin ? '登录秒杀系统' : '注册新账号'}</h2>
        
        <form onSubmit={handleSubmit}>
          {/* 角色选择 */}
          <div className="role-selector">
            <label 
              className={role === 0 ? 'active' : ''}
              onClick={() => setRole(0)}
            >
              <span className="role-icon">🛒</span>
              <span>我是买家</span>
            </label>
            <label 
              className={role === 1 ? 'active' : ''}
              onClick={() => setRole(1)}
            >
              <span className="role-icon">🏪</span>
              <span>我是商家</span>
            </label>
          </div>
          
          <div className="form-group">
            <label>用户名</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder={role === 1 ? "请输入商家用户名" : "请输入用户名"} 
              required 
              minLength={3}
              maxLength={20}
            />
          </div>
          
          <div className="form-group">
            <label>密码</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="请输入密码" 
              required 
              minLength={6}
            />
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label>确认密码</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="请再次输入密码" 
                required 
                minLength={6}
              />
            </div>
          )}
          
          {error && <div className="error-text">{error}</div>}
          
          <button 
            type="submit" 
            className="btn btn-primary full-width"
            disabled={loading}
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>
        
        <div className="toggle-mode">
          {isLogin ? (
            <p>
              还没有账号？ 
              <button type="button" className="link-btn" onClick={toggleMode}>
                立即注册
              </button>
            </p>
          ) : (
            <p>
              已有账号？ 
              <button type="button" className="link-btn" onClick={toggleMode}>
                立即登录
              </button>
            </p>
          )}
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
          <p>买家账号: test / 123456</p>
          <p>或注册新账号体验完整功能</p>
        </div>
      </div>
      
      <style>{`
        .role-selector {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .role-selector label {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #d9d9d9;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .role-selector label:hover {
          border-color: #1890ff;
        }
        .role-selector label.active {
          border-color: #1890ff;
          background: #e6f7ff;
        }
        .role-icon {
          font-size: 20px;
        }
        .toggle-mode {
          text-align: center;
          margin-top: 16px;
          color: #666;
        }
        .link-btn {
          background: none;
          border: none;
          color: #1890ff;
          cursor: pointer;
          text-decoration: underline;
          font-size: inherit;
        }
        .link-btn:hover {
          color: #40a9ff;
        }
      `}</style>
    </div>
  );
};
