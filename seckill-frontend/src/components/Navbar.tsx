import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  extra?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ showBack, onBack, extra }) => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '用户';
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const initial = username.charAt(0).toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate(role === '1' ? '/seller' : '/goods')}>
          ⚡ 闪购秒杀
        </div>

        {/* Center links */}
        <div className="navbar-links">
          {showBack && (
            <button className="btn btn-ghost btn-sm" onClick={onBack || (() => navigate(-1))}>
              ← 返回
            </button>
          )}
          {role !== '1' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/goods')}>
                商品
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}>
                我的订单
              </button>
            </>
          )}
          {extra}
        </div>

        {/* Right: user info */}
        <div className="navbar-user">
          <div
            className="avatar"
            title="个人信息"
            onClick={() => navigate('/profile')}
          >
            {initial}
          </div>
          <span className="username-text" onClick={() => navigate('/profile')}>
            {username}
          </span>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            退出
          </button>
        </div>
      </div>
    </nav>
  );
};
