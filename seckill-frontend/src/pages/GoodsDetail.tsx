import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { Navbar } from '../components/Navbar';

export const GoodsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [goods, setGoods] = useState<any>(null);
  const [seckillStatus, setSeckillStatus] = useState<'idle' | 'waiting' | 'success' | 'failed'>('idle');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      navigate('/');
      return;
    }
    fetchDetail();
  }, [id, navigate]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res: any = await request.get(`/goods/detail/${id}`);
      if (res?.data) setGoods(res.data);
    } catch (err) {
      console.error('获取商品详情失败', err);
    } finally {
      setLoading(false);
    }
  };

  const doSeckill = async () => {
    setSeckillStatus('waiting');
    setSubmitting(true);
    try {
      const res: any = await request.post(`/goods/seckill/${id}`);
      if (res?.code === 200) {
        setSeckillStatus('success');
        alert(`🎉 秒杀成功！订单号: ${res.data}`);
        fetchDetail();
        navigate('/orders');
      } else {
        setSeckillStatus('failed');
        alert(res?.message || '秒杀失败，请重试');
      }
    } catch (err: any) {
      setSeckillStatus('failed');
      alert(err.response?.data?.message || '秒杀失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return '已下线'; case 1: return '准备中';
      case 2: return '进行中'; case 3: return '已结束';
      default: return '未知';
    }
  };

  const getStatusClass = (status: number) => {
    switch (status) {
      case 0: return 'badge-offline'; case 1: return 'badge-preparing';
      case 2: return 'badge-active'; case 3: return 'badge-ended';
      default: return 'badge-offline';
    }
  };

  const getSoldPercent = () => {
    if (!goods) return 0;
    const total = (goods.soldCount || 0) + goods.stockCount;
    if (!total) return 0;
    return Math.round(((goods.soldCount || 0) / total) * 100);
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-';

  if (loading) {
    return (
      <>
        <Navbar showBack onBack={() => navigate('/goods')} />
        <div className="loading-page"><div className="spinner" /><span>加载中...</span></div>
      </>
    );
  }

  if (!goods) {
    return (
      <>
        <Navbar showBack onBack={() => navigate('/goods')} />
        <div className="empty-state">
          <div className="empty-icon">😕</div>
          <h3>商品不存在</h3>
          <button className="btn btn-primary" onClick={() => navigate('/goods')}>返回列表</button>
        </div>
      </>
    );
  }

  const soldPct = getSoldPercent();

  return (
    <div>
      <Navbar showBack onBack={() => navigate('/goods')} />

      <div className="detail-page">
        {/* 面包屑 */}
        <div className="detail-breadcrumb">
          <span onClick={() => navigate('/goods')}>商品列表</span>
          <span style={{ color: 'var(--border-color)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>商品详情</span>
        </div>

        <div className="detail-card">
          {/* 商品图片 */}
          <div className="detail-img-wrap">
            {goods.imageUrl ? (
              <img src={goods.imageUrl} alt={`商品${goods.id}`} className="detail-img" />
            ) : (
              <div className="detail-img-placeholder"
                style={{ background: `linear-gradient(135deg, hsl(${(goods.id * 37) % 360},55%,85%), hsl(${(goods.id * 37 + 50) % 360},55%,75%))` }}
              >
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>秒杀商品 #{goods.id}</span>
              </div>
            )}
          </div>

          {/* 商品信息 */}
          <div className="detail-info">
            {/* 状态 */}
            <div className="detail-badge">
              <span className={`badge ${getStatusClass(goods.status)}`}>
                {getStatusText(goods.status)}
              </span>
            </div>

            <h1 className="detail-title">秒杀商品 #{goods.id}</h1>

            {/* 价格 */}
            <div className="price-block">
              <div className="price-label">秒杀价格</div>
              <div className="price-value">
                <span className="price-seckill">
                  <span className="price-seckill-unit">¥</span>
                  {goods.seckillPrice}
                </span>
              </div>
            </div>

            {/* 库存 & 已售 */}
            <div className="detail-stats-row">
              <div className="detail-stat">
                <div className="detail-stat-label">剩余库存</div>
                <div className="detail-stat-value" style={{ color: goods.stockCount <= 10 ? 'var(--color-accent)' : 'var(--text-primary)' }}>
                  {goods.stockCount}
                </div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat-label">已售数量</div>
                <div className="detail-stat-value">{goods.soldCount || 0}</div>
              </div>
            </div>

            {/* 销售进度 */}
            <div className="stock-progress">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>抢购进度</span>
                <span>{soldPct}% 已售</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${soldPct >= 80 ? 'danger' : soldPct >= 50 ? 'warn' : ''}`}
                  style={{ width: `${soldPct}%` }}
                />
              </div>
            </div>

            {/* 时间 */}
            <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <div>🕐 开始时间：{formatDate(goods.startDate)}</div>
              <div>⏰ 结束时间：{formatDate(goods.endDate)}</div>
            </div>

            {/* 操作按钮 */}
            <div className="action-block">
              {seckillStatus === 'success' ? (
                <button className="btn btn-success full-width btn-lg" disabled>
                  ✅ 秒杀成功，跳转中...
                </button>
              ) : submitting ? (
                <button className="btn btn-primary full-width btn-lg" disabled>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                    style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  秒杀中...
                </button>
              ) : goods.status !== 2 ? (
                <button className="btn btn-outline full-width btn-lg" disabled>
                  {goods.status === 1 ? '⏳ 活动未开始' : goods.status === 3 ? '活动已结束' : '商品已下线'}
                </button>
              ) : goods.stockCount <= 0 ? (
                <button className="btn btn-outline full-width btn-lg" disabled>
                  😔 已售罄
                </button>
              ) : (
                <button className="btn btn-danger full-width btn-lg" onClick={doSeckill}>
                  🔥 立即秒杀
                </button>
              )}
            </div>

            {goods.stockCount > 0 && goods.stockCount <= 20 && goods.status === 2 && (
              <p style={{ textAlign: 'center', color: 'var(--color-accent)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>
                ⚡ 仅剩 {goods.stockCount} 件，赶快抢！
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
