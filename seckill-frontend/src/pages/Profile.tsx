import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { Navbar } from '../components/Navbar';

interface UserInfo {
  id: number;
  nickname: string;
  role: number;
  shopName?: string;
  registerDate?: string;
  lastLoginDate?: string;
  loginCount?: number;
}

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editShopName, setEditShopName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      navigate('/');
      return;
    }
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/user/info');
      if (res?.code === 200 && res.data) {
        setUserInfo(res.data);
        setEditNickname(res.data.nickname || '');
        setEditShopName(res.data.shopName || '');
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editNickname.trim()) { setSaveMsg('昵称不能为空'); return; }
    setSaving(true);
    setSaveMsg('');
    try {
      const res: any = await request.put('/user/update', {
        nickname: editNickname.trim(),
        shopName: editShopName.trim() || null,
      });
      if (res?.code === 200) {
        localStorage.setItem('username', editNickname.trim());
        if (editShopName.trim()) localStorage.setItem('shopName', editShopName.trim());
        await fetchProfile();
        setEditing(false);
        setSaveMsg('');
      } else {
        setSaveMsg(res?.message || '保存失败');
      }
    } catch (e: any) {
      setSaveMsg(e.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleString('zh-CN') : '-';
  const initial = (userInfo?.nickname || '?').charAt(0).toUpperCase();

  if (loading) {
    return (
      <>
        <Navbar showBack onBack={() => navigate(-1)} />
        <div className="loading-page"><div className="spinner" /><span>加载中...</span></div>
      </>
    );
  }

  return (
    <div>
      <Navbar showBack onBack={() => navigate(-1)} />

      <div className="profile-page">
        {/* Header card */}
        <div className="profile-header-card">
          <div className="profile-avatar-lg">{initial}</div>
          <div>
            <div className="profile-name">{userInfo?.nickname}</div>
            <span className="profile-role-tag">
              {userInfo?.role === 1 ? '🏪 商家' : '🛒 买家'}
            </span>
            {userInfo?.role === 1 && userInfo?.shopName && (
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                {userInfo.shopName}
              </div>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="profile-info-card">
          {editing ? (
            /* Edit form */
            <div style={{ padding: 4 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18, color: 'var(--text-primary)' }}>
                ✏️ 编辑资料
              </h4>
              <div className="form-group">
                <label className="form-label">昵称</label>
                <input
                  className="form-input"
                  value={editNickname}
                  onChange={e => setEditNickname(e.target.value)}
                  placeholder="请输入昵称"
                  maxLength={20}
                />
              </div>
              {userInfo?.role === 1 && (
                <div className="form-group">
                  <label className="form-label">店铺名称</label>
                  <input
                    className="form-input"
                    value={editShopName}
                    onChange={e => setEditShopName(e.target.value)}
                    placeholder="请输入店铺名称"
                    maxLength={50}
                  />
                </div>
              )}
              {saveMsg && (
                <div style={{
                  fontSize: 13, marginBottom: 14, padding: '8px 12px',
                  background: saveMsg.includes('成功') ? 'rgba(82,196,26,0.08)' : 'rgba(255,77,79,0.08)',
                  color: saveMsg.includes('成功') ? 'var(--color-success)' : 'var(--color-accent)',
                  borderRadius: 'var(--border-radius-sm)',
                }}>
                  {saveMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中...' : '💾 保存'}
                </button>
                <button className="btn btn-outline" onClick={() => { setEditing(false); setSaveMsg(''); }}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            /* Display */
            <>
              <div className="profile-info-item">
                <span className="profile-info-label">
                  <span>🆔</span> 用户ID
                </span>
                <span className="profile-info-value" style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>
                  #{userInfo?.id}
                </span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">
                  <span>👤</span> 昵称
                </span>
                <span className="profile-info-value">{userInfo?.nickname || '-'}</span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">
                  <span>🎭</span> 角色
                </span>
                <span className="profile-info-value">
                  {userInfo?.role === 1 ? '商家' : '买家'}
                </span>
              </div>

              {userInfo?.role === 1 && (
                <div className="profile-info-item">
                  <span className="profile-info-label">
                    <span>🏪</span> 店铺名称
                  </span>
                  <span className="profile-info-value">{userInfo?.shopName || '未设置'}</span>
                </div>
              )}

              <div className="profile-info-item">
                <span className="profile-info-label">
                  <span>📅</span> 注册时间
                </span>
                <span className="profile-info-value" style={{ fontSize: 13 }}>{formatDate(userInfo?.registerDate)}</span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">
                  <span>🕐</span> 上次登录
                </span>
                <span className="profile-info-value" style={{ fontSize: 13 }}>{formatDate(userInfo?.lastLoginDate)}</span>
              </div>

              <div className="profile-info-item">
                <span className="profile-info-label">
                  <span>🔢</span> 登录次数
                </span>
                <span className="profile-info-value">{userInfo?.loginCount ?? 0} 次</span>
              </div>

              <div style={{ marginTop: 20, paddingTop: 4 }}>
                <button className="btn btn-primary" onClick={() => setEditing(true)}>
                  ✏️ 编辑资料
                </button>
              </div>
            </>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {role !== '1' ? (
            <>
              <button
                className="card"
                onClick={() => navigate('/goods')}
                style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: 'none', textAlign: 'left', minWidth: 140, transition: 'var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
              >
                <span style={{ fontSize: 28 }}>🔥</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>去秒杀</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>浏览秒杀商品</div>
                </div>
              </button>
              <button
                className="card"
                onClick={() => navigate('/orders')}
                style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: 'none', textAlign: 'left', minWidth: 140, transition: 'var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
              >
                <span style={{ fontSize: 28 }}>📋</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>我的订单</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>查看订单状态</div>
                </div>
              </button>
            </>
          ) : (
            <button
              className="card"
              onClick={() => navigate('/seller')}
              style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: 'none', textAlign: 'left', minWidth: 140, transition: 'var(--transition)' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
            >
              <span style={{ fontSize: 28 }}>🏪</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>商家后台</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>管理商品和订单</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
