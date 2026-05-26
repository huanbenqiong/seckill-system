import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

interface Stats {
  totalProducts: number;
  totalStock: number;
  totalSold: number;
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  totalSales: number;
}

interface Product {
  id: number;
  goodsId: number;
  seckillPrice: number;
  stockCount: number;
  soldCount: number;
  startDate: string;
  endDate: string;
  status: number;
}

interface Order {
  id: number;
  userId: number;
  seckillId: number;
  seckillPrice: number;
  amount: number;
  status: number;
  createTime: string;
  payTime: string;
}

interface ProductForm {
  seckillPrice: string;
  stockCount: string;
  startDate: string;
  endDate: string;
}

export const SellerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    seckillPrice: '',
    stockCount: '',
    startDate: '',
    endDate: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    
    if (!userId) {
      alert('请先登录');
      navigate('/');
      return;
    }
    
    if (role !== '1') {
      alert('您不是商家，请使用商家账号登录');
      navigate('/');
      return;
    }

    fetchData();
  }, [navigate]);

  // 定时刷新数据（每3秒）
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataSilent();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchDataSilent = async () => {
    try {
      const [statsRes, productsRes, ordersRes] = await Promise.all([
        request.get('/seller/dashboard'),
        request.get('/seller/products'),
        request.get('/seller/orders')
      ]);

      if (statsRes.code === 200) setStats(statsRes.data);
      if (productsRes.code === 200) setProducts(productsRes.data);
      if (ordersRes.code === 200) setOrders(ordersRes.data);
    } catch (err) {
      // 静默失败，不显示错误
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setLastRefresh(new Date());
    try {
      const [statsRes, productsRes, ordersRes] = await Promise.all([
        request.get('/seller/dashboard'),
        request.get('/seller/products'),
        request.get('/seller/orders')
      ]);

      if (statsRes.code === 200) setStats(statsRes.data);
      if (productsRes.code === 200) setProducts(productsRes.data);
      if (ordersRes.code === 200) setOrders(ordersRes.data);
    } catch (err) {
      console.error('获取数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishProduct = async () => {
    if (!productForm.seckillPrice || !productForm.stockCount) {
      alert('请填写价格和库存');
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await request.post('/seller/products', {
        seckillPrice: parseFloat(productForm.seckillPrice),
        stockCount: parseInt(productForm.stockCount),
        startDate: productForm.startDate || new Date().toISOString(),
        endDate: productForm.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (res.code === 200) {
        alert(`商品发布成功！商品ID: ${res.data.seckillId}`);
        setShowAddForm(false);
        setProductForm({ seckillPrice: '', stockCount: '', startDate: '', endDate: '' });
        fetchData();
      } else {
        alert(res.message || '发布失败');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('确定要删除该商品吗？')) return;

    try {
      const res: any = await request.delete(`/seller/products/${id}`);
      if (res.code === 200) {
        alert('删除成功');
        fetchData();
      }
    } catch (err) {
      console.error('删除失败', err);
    }
  };

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
      case 0: return 'status-offline';
      case 1: return 'status-preparing';
      case 2: return 'status-active';
      case 3: return 'status-ended';
      default: return '';
    }
  };

  const getOrderStatusText = (status: number) => {
    switch (status) {
      case 0: return '待支付';
      case 1: return '已支付';
      case 2: return '已取消';
      case 3: return '已超时';
      default: return '未知';
    }
  };

  const getOrderStatusClass = (status: number) => {
    switch (status) {
      case 0: return 'status-pending';
      case 1: return 'status-paid';
      case 2: return 'status-cancelled';
      default: return '';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  if (loading) return <div className="container"><div className="loading">加载中...</div></div>;

  return (
    <div className="container">
      <header className="seller-header">
        <h2>🏪 商家管理中心</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>每3秒自动刷新</span>
          <button className="btn btn-outline" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }} onClick={fetchData}>🔄 刷新</button>
          <button className="btn btn-outline" onClick={() => { localStorage.clear(); navigate('/'); }}>退出登录</button>
        </div>
      </header>

      <div className="seller-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 数据中心</button>
        <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>📦 商品管理</button>
        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>📋 订单管理</button>
      </div>

      {/* 数据中心 */}
      {activeTab === 'dashboard' && stats && (
        <div>
          <h3 style={{ marginBottom: '16px' }}>经营概览</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalProducts}</div>
                <div className="stat-label">商品总数</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalSold}</div>
                <div className="stat-label">已售数量</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalOrders}</div>
                <div className="stat-label">订单总数</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.pendingOrders}</div>
                <div className="stat-label">待支付</div>
              </div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">¥{stats.totalSales}</div>
                <div className="stat-label">销售额</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 商品管理 */}
      {activeTab === 'products' && (
        <div>
          <div className="section-header">
            <h3>商品列表</h3>
            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '取消发布' : '+ 发布秒杀商品'}
            </button>
          </div>

          {showAddForm && (
            <div className="publish-form card">
              <h4>发布秒杀商品</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>秒杀价格 (元) <span className="required">*</span></label>
                  <input
                    type="number"
                    value={productForm.seckillPrice}
                    onChange={(e) => setProductForm({ ...productForm, seckillPrice: e.target.value })}
                    placeholder="请输入商品价格"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>库存数量 <span className="required">*</span></label>
                  <input
                    type="number"
                    value={productForm.stockCount}
                    onChange={(e) => setProductForm({ ...productForm, stockCount: e.target.value })}
                    placeholder="请输入库存数量"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>活动开始时间</label>
                  <input
                    type="datetime-local"
                    value={productForm.startDate}
                    onChange={(e) => setProductForm({ ...productForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>活动结束时间</label>
                  <input
                    type="datetime-local"
                    value={productForm.endDate}
                    onChange={(e) => setProductForm({ ...productForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handlePublishProduct} disabled={submitting}>
                  {submitting ? '发布中...' : '确认发布'}
                </button>
                <button className="btn btn-outline" onClick={() => setShowAddForm(false)}>取消</button>
              </div>
              <p className="form-tip">发布后商品将立即显示在买家的秒杀列表中</p>
            </div>
          )}

          <div className="table-container">
            {products.length === 0 ? (
              <div className="empty-state">
                <p>暂无商品</p>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>发布第一件商品</button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>商品ID</th>
                    <th>秒杀价</th>
                    <th>库存</th>
                    <th>已售</th>
                    <th>状态</th>
                    <th>开始时间</th>
                    <th>结束时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td className="id-cell">{product.id}</td>
                      <td className="price-cell">¥{product.seckillPrice}</td>
                      <td>{product.stockCount}</td>
                      <td>{product.soldCount}</td>
                      <td><span className={`status-badge ${getStatusClass(product.status)}`}>{getStatusText(product.status)}</span></td>
                      <td>{formatDate(product.startDate)}</td>
                      <td>{formatDate(product.endDate)}</td>
                      <td>
                        <button className="btn-text-danger" onClick={() => handleDeleteProduct(product.id)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 订单管理 */}
      {activeTab === 'orders' && (
        <div>
          <h3 style={{ marginBottom: '16px' }}>订单列表</h3>
          <div className="table-container">
            {orders.length === 0 ? (
              <div className="empty-state">
                <p>暂无订单</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>用户ID</th>
                    <th>商品ID</th>
                    <th>秒杀价</th>
                    <th>实付金额</th>
                    <th>状态</th>
                    <th>下单时间</th>
                    <th>支付时间</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="id-cell">{order.id}</td>
                      <td>{order.userId}</td>
                      <td>{order.seckillId}</td>
                      <td className="price-cell">¥{order.seckillPrice}</td>
                      <td className="price-cell">¥{order.amount}</td>
                      <td><span className={`status-badge ${getOrderStatusClass(order.status)}`}>{getOrderStatusText(order.status)}</span></td>
                      <td>{formatDate(order.createTime)}</td>
                      <td>{formatDate(order.payTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <style>{`
        .seller-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .seller-header h2 {
          margin: 0;
          font-size: 24px;
        }
        .seller-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: white;
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .seller-tabs button {
          flex: 1;
          padding: 14px 24px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 15px;
          color: #666;
          border-radius: 8px;
          transition: all 0.3s;
        }
        .seller-tabs button:hover {
          background: #f5f5f5;
        }
        .seller-tabs button.active {
          background: #667eea;
          color: white;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.3s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
        .stat-card.highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .stat-icon {
          font-size: 32px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
        }
        .stat-label {
          font-size: 13px;
          opacity: 0.8;
          margin-top: 4px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-header h3 {
          margin: 0;
        }
        .publish-form {
          padding: 24px;
          margin-bottom: 20px;
          background: #fafafa;
          border: 2px dashed #ddd;
        }
        .publish-form h4 {
          margin: 0 0 20px 0;
          color: #333;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .form-group label {
          margin-bottom: 6px;
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }
        .form-group .required {
          color: #ff4d4f;
        }
        .form-group input {
          padding: 10px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.3s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .form-tip {
          margin-top: 12px;
          font-size: 12px;
          color: #888;
        }
        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          background: #fafafa;
          padding: 14px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #666;
          border-bottom: 1px solid #eee;
        }
        .data-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f5f5f5;
          font-size: 14px;
        }
        .data-table tr:hover {
          background: #fafafa;
        }
        .id-cell {
          font-family: monospace;
          color: #888;
        }
        .price-cell {
          color: #ff4d4f;
          font-weight: 500;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
        }
        .status-offline { background: #f5f5f5; color: #999; }
        .status-preparing { background: #e6f7ff; color: #1890ff; }
        .status-active { background: #f6ffed; color: #52c41a; }
        .status-ended { background: #fff7e6; color: #fa8c16; }
        .status-pending { background: #fff7e6; color: #fa8c16; }
        .status-paid { background: #f6ffed; color: #52c41a; }
        .status-cancelled { background: #f5f5f5; color: #999; }
        .btn-text-danger {
          background: none;
          border: none;
          color: #ff4d4f;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
        }
        .btn-text-danger:hover {
          text-decoration: underline;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }
        .empty-state p {
          margin-bottom: 20px;
        }
        .loading {
          text-align: center;
          padding: 60px;
          color: #666;
        }
      `}</style>
    </div>
  );
};
