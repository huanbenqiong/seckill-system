import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { Navbar } from '../components/Navbar';

interface Goods {
  id: number;
  goodsId: number;
  name?: string;
  goodsName?: string;
  seckillPrice: number;
  stockCount: number;
  soldCount: number;
  startDate: string;
  endDate: string;
  status: number;
  imageUrl?: string;
}

type StatusFilter = 'all' | '2' | '1' | '3' | '0';
type SortKey = 'default' | 'price_asc' | 'price_desc' | 'stock_asc' | 'sold_desc';

export const GoodsList: React.FC = () => {
  const [goodsList, setGoodsList] = useState<Goods[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      navigate('/');
      return;
    }
    fetchGoods();
    const interval = setInterval(fetchGoodsSilent, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchGoods = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/goods/list');
      if (res?.data) setGoodsList(res.data);
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  };

  const fetchGoodsSilent = async () => {
    try {
      const res: any = await request.get('/goods/list');
      if (res?.data) setGoodsList(res.data);
    } catch {/* ignore */}
  };

  // 搜索 + 筛选 + 排序（全客户端）
  const filtered = useMemo(() => {
    setPage(1); // 筛选变化时回到第一页
    let list = [...goodsList];

    // 搜索（按商品名称或 ID）
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(g =>
        String(g.id).includes(q) ||
        (g.name || g.goodsName || '').toLowerCase().includes(q)
      );
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      list = list.filter(g => String(g.status) === statusFilter);
    }

    // 排序
    switch (sortKey) {
      case 'price_asc':  list.sort((a, b) => a.seckillPrice - b.seckillPrice); break;
      case 'price_desc': list.sort((a, b) => b.seckillPrice - a.seckillPrice); break;
      case 'stock_asc':  list.sort((a, b) => a.stockCount - b.stockCount); break;
      case 'sold_desc':  list.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)); break;
    }

    return list;
  }, [goodsList, search, statusFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return '已下线';
      case 1: return '准备中';
      case 2: return '进行中';
      case 3: return '已结束';
      default: return '未知';
    }
  };

  const getStatusClass = (status: number) => {
    switch (status) {
      case 0: return 'badge-offline';
      case 1: return 'badge-preparing';
      case 2: return 'badge-active';
      case 3: return 'badge-ended';
      default: return 'badge-offline';
    }
  };

  const getSoldPercent = (g: Goods) => {
    const total = (g.soldCount || 0) + g.stockCount;
    if (!total) return 0;
    return Math.round(((g.soldCount || 0) / total) * 100);
  };

  const getProgressClass = (pct: number) => {
    if (pct >= 80) return 'danger';
    if (pct >= 50) return 'warn';
    return '';
  };

  const formatEndTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff <= 0) return '已结束';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}天后结束`;
    if (hours > 0) return `${hours}小时后结束`;
    return '即将结束';
  };

  const statusTabs: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: '全部' },
    { key: '2', label: '进行中' },
    { key: '1', label: '准备中' },
    { key: '3', label: '已结束' },
    { key: '0', label: '已下线' },
  ];

  return (
    <div className="goods-list-page">
      <Navbar />

      {/* Hero */}
      <div className="page-hero">
        <h2>🔥 限时秒杀</h2>
        <p>好货限量，错过不再有</p>
      </div>

      {/* 筛选栏 */}
      <div className="filter-section">
        <div className="filter-bar">
          {/* 搜索框 */}
          <div className="search-wrap">
            <span className="search-icon-abs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="search-input"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索商品名称或 ID..."
            />
          </div>

          {/* 状态筛选 tabs */}
          <div className="filter-tabs">
            {statusTabs.map(tab => (
              <button
                key={tab.key}
                className={`filter-tab${statusFilter === tab.key ? ' active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 排序 */}
          <select
            className="sort-select"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
          >
            <option value="default">默认排序</option>
            <option value="price_asc">价格 从低到高</option>
            <option value="price_desc">价格 从高到低</option>
            <option value="stock_asc">库存 从少到多</option>
            <option value="sold_desc">销量 从多到少</option>
          </select>
        </div>

        <p className="results-count">共 {filtered.length} 件商品</p>
      </div>

      {/* 商品列表 */}
      <div className="container">
        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
            <span>加载中...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛍️</div>
            <h3>暂无商品</h3>
            <p>{search || statusFilter !== 'all' ? '尝试清除筛选条件' : '敬请期待新品上架'}</p>
            {(search || statusFilter !== 'all') && (
              <button className="btn btn-outline" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                清除筛选
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="goods-grid">
            {pageItems.map(goods => {
              const soldPct = getSoldPercent(goods);
              const displayName = goods.name || goods.goodsName || `秒杀商品 #${goods.id}`;
              return (
                <div
                  key={goods.id}
                  className="goods-card"
                  onClick={() => navigate(`/goods/${goods.id}`)}
                >
                  {/* 图片 */}
                  <div className="goods-img-wrap">
                    {goods.imageUrl ? (
                      <img src={goods.imageUrl} alt={`商品${goods.id}`} className="goods-img" />
                    ) : (
                      <div className="goods-img-placeholder"
                        style={{ background: `linear-gradient(135deg, hsl(${(goods.id * 37) % 360},60%,88%), hsl(${(goods.id * 37 + 40) % 360},60%,78%))` }}
                      >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="3"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{displayName}</span>
                      </div>
                    )}
                    <div className="goods-badge-wrap">
                      <span className={`badge ${getStatusClass(goods.status)}`}>
                        {getStatusText(goods.status)}
                      </span>
                    </div>
                  </div>

                  {/* 商品信息 */}
                  <div className="goods-info">
                    <div className="goods-title">
                      {displayName}
                    </div>
                    <div className="goods-price-row">
                      <span className="seckill-price">¥{goods.seckillPrice}</span>
                    </div>

                    {/* 销售进度 */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
                        <span>已售 {goods.soldCount || 0} 件</span>
                        <span>剩余 {goods.stockCount} 件</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${getProgressClass(soldPct)}`}
                          style={{ width: `${soldPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="goods-meta">
                      <span>⏰ {formatEndTime(goods.endDate)}</span>
                      <span>📦 {goods.stockCount > 0 ? `库存${goods.stockCount}` : '已售罄'}</span>
                    </div>
                  </div>

                  <div className="goods-card-footer">
                    <button
                      className={`btn full-width ${goods.status === 2 && goods.stockCount > 0 ? 'btn-danger' : 'btn-outline'}`}
                      disabled={goods.status !== 2 || goods.stockCount <= 0}
                      onClick={e => { e.stopPropagation(); navigate(`/goods/${goods.id}`); }}
                    >
                      {goods.status === 2 && goods.stockCount > 0 ? '🔥 立即抢购' : '查看详情'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 32, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ minWidth: 72 }}
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                      background: p === page ? 'var(--gradient-primary)' : 'white',
                      color: p === page ? 'white' : 'var(--text-secondary)',
                      boxShadow: p === page ? 'var(--shadow)' : 'none',
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ minWidth: 72 }}
                >
                  下一页
                </button>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                第 {page} 页 / 共 {totalPages} 页 · {filtered.length} 件商品
              </span>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};
