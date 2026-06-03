import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import request from '../utils/request';
import { AIChatWidget } from '../components/AIChatWidget';
import { Navbar } from '../components/Navbar';

// ====== 数据中心可视化（演示数据，前端写死） ======
const SALES_TREND = [
  { d: '周一', 销售额: 12400, 订单: 86 },
  { d: '周二', 销售额: 15800, 订单: 102 },
  { d: '周三', 销售额: 13900, 订单: 94 },
  { d: '周四', 销售额: 21300, 订单: 143 },
  { d: '周五', 销售额: 28600, 订单: 187 },
  { d: '周六', 销售额: 35200, 订单: 241 },
  { d: '周日', 销售额: 31800, 订单: 213 },
];
const CATEGORY_PIE = [
  { name: '手机数码', value: 38 },
  { name: '家用电器', value: 24 },
  { name: '电脑办公', value: 16 },
  { name: '服装鞋帽', value: 12 },
  { name: '其他', value: 10 },
];
const PIE_COLORS = ['#667eea', '#764ba2', '#52c41a', '#faad14', '#ff7875'];

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
  goodsName: string;
  seckillPrice: string;
  stockCount: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
}

interface EditForm {
  id: number;
  seckillPrice: string;
  stockCount: number;
  stockChange: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
}

// ---- Image Upload sub-component (defined at module level to avoid remounting) ----
interface ImageUploadProps {
  imageUrl: string;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ imageUrl, uploading, fileInputRef, onSelect, onClear }) => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
    {/* Preview */}
    <div style={{
      width: 96, height: 96, borderRadius: 8,
      border: '2px dashed var(--border-color)',
      overflow: 'hidden', flexShrink: 0,
      background: 'var(--bg-page)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {imageUrl ? (
        <img src={imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          <div style={{ fontSize: 24, marginBottom: 2 }}>🖼️</div>
          <div>暂无图片</div>
        </div>
      )}
    </div>

    {/* Controls */}
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onSelect}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} /> 上传中…</>
          ) : '📷 选择图片'}
        </button>
        {imageUrl && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--color-accent)', borderColor: 'rgba(255,77,79,0.3)' }}
            onClick={onClear}
          >
            删除
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
        支持 JPG / PNG / GIF / WebP<br />最大 5 MB
      </p>
    </div>
  </div>
);

// ---- Main component ----
export const SellerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Add product form
  const [showAddForm, setShowAddForm] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    goodsName: '', seckillPrice: '', stockCount: '', startDate: '', endDate: '', imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);

  // Edit product modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    if (!userId) { navigate('/'); return; }
    if (role !== '1') { navigate('/goods'); return; }
    fetchData();
  }, [navigate]);

  // Polling every 3 s
  useEffect(() => {
    const t = setInterval(fetchDataSilent, 3000);
    return () => clearInterval(t);
  }, []);

  const fetchDataSilent = async () => {
    try {
      const [s, p, o] = await Promise.all([
        request.get('/seller/dashboard'),
        request.get('/seller/products'),
        request.get('/seller/orders'),
      ]) as any[];
      if (s.code === 200) setStats(s.data);
      if (p.code === 200) setProducts(p.data);
      if (o.code === 200) setOrders(o.data);
    } catch { /* silent */ }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, p, o] = await Promise.all([
        request.get('/seller/dashboard'),
        request.get('/seller/products'),
        request.get('/seller/orders'),
      ]) as any[];
      if (s.code === 200) setStats(s.data);
      if (p.code === 200) setProducts(p.data);
      if (o.code === 200) setOrders(o.data);
    } catch (err) {
      console.error('获取数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Image upload handler ----
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'add' | 'edit',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = target === 'add' ? setImageUploading : setEditImageUploading;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res: any = await request.post('/seller/upload', formData);
      if (res?.code === 200) {
        if (target === 'add') {
          setProductForm(p => ({ ...p, imageUrl: res.data }));
        } else {
          setEditForm(p => p ? { ...p, imageUrl: res.data } : p);
        }
      } else {
        alert(res?.message || '上传失败');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '图片上传失败，请重试');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ---- CRUD handlers ----
  const handlePublishProduct = async () => {
    if (!productForm.goodsName.trim()) {
      alert('请填写商品名称');
      return;
    }
    if (!productForm.seckillPrice || !productForm.stockCount) {
      alert('请填写秒杀价格和库存数量');
      return;
    }
    setSubmitting(true);
    try {
      const res: any = await request.post('/seller/products', {
        goodsName: productForm.goodsName.trim(),
        name: productForm.goodsName.trim(),
        seckillPrice: parseFloat(productForm.seckillPrice),
        stockCount: parseInt(productForm.stockCount),
        startDate: productForm.startDate || new Date().toISOString(),
        endDate: productForm.endDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        imageUrl: productForm.imageUrl || null,
      });
      if (res.code === 200) {
        alert(`🎉 商品发布成功！ID: ${res.data?.seckillId || res.data?.id || ''}`);
        setShowAddForm(false);
        setProductForm({ goodsName: '', seckillPrice: '', stockCount: '', startDate: '', endDate: '', imageUrl: '' });
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

  const handleEditClick = (product: Product) => {
    setEditForm({
      id: product.id,
      seckillPrice: String(product.seckillPrice),
      stockCount: product.stockCount,
      stockChange: '',
      startDate: product.startDate ? product.startDate.slice(0, 16) : '',
      endDate: product.endDate ? product.endDate.slice(0, 16) : '',
      imageUrl: product.imageUrl || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm?.seckillPrice) { alert('请填写秒杀价格'); return; }
    setSubmitting(true);
    try {
      const data: any = {
        seckillPrice: parseFloat(editForm.seckillPrice),
        imageUrl: editForm.imageUrl || null,
      };
      if (editForm.startDate) data.startDate = new Date(editForm.startDate).toISOString();
      if (editForm.endDate)   data.endDate   = new Date(editForm.endDate).toISOString();
      if (editForm.stockChange !== '') data.stockChange = parseInt(editForm.stockChange);

      const res: any = await request.put(`/seller/products/${editForm.id}`, data);
      if (res.code === 200) {
        setShowEditModal(false);
        setEditForm(null);
        fetchData();
      } else {
        alert(res.message || '更新失败');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('确定要删除该商品吗？删除后无法恢复。')) return;
    try {
      const res: any = await request.delete(`/seller/products/${id}`);
      if (res.code === 200) fetchData();
    } catch { /* ignore */ }
  };

  // ---- Helpers ----
  const getStatusText = (s: number) => ({ 0: '已下线', 1: '准备中', 2: '进行中', 3: '已结束' }[s] ?? '未知');
  const getStatusClass = (s: number) => ({ 0: 'badge-offline', 1: 'badge-preparing', 2: 'badge-active', 3: 'badge-ended' }[s] ?? 'badge-offline');
  const getOrderStatusText = (s: number) => ({ 0: '待支付', 1: '已支付', 2: '已取消', 3: '已超时' }[s] ?? '未知');
  const getOrderStatusClass = (s: number) => ({ 0: 'badge-pending', 1: 'badge-paid', 2: 'badge-cancelled', 3: 'badge-cancelled' }[s] ?? '');
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString('zh-CN') : '-';

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-page"><div className="spinner" /><span>加载中…</span></div>
      </>
    );
  }

  const shopName = localStorage.getItem('shopName');

  return (
    <div style={{ paddingBottom: 60 }}>
      <Navbar />

      {/* Hero bar */}
      <div style={{ background: 'var(--gradient-primary)', color: 'white', padding: '22px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🏪 商家管理中心</h2>
            {shopName && <p style={{ margin: '3px 0 0', opacity: 0.82, fontSize: 13 }}>{shopName}</p>}
          </div>
          <button
            onClick={fetchData}
            style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'white', borderRadius: 'var(--border-radius-full)', padding: '7px 16px',
              cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            🔄 刷新
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 24,
          background: 'white', padding: 8, borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow)',
        }}>
          {[
            { key: 'dashboard', icon: '📊', label: '数据中心' },
            { key: 'products',  icon: '📦', label: '商品管理' },
            { key: 'orders',    icon: '📋', label: '订单管理' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '11px 16px', border: 'none', borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'var(--transition)',
                background: activeTab === tab.key ? 'var(--gradient-primary)' : 'transparent',
                color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ========== Dashboard ========== */}
        {activeTab === 'dashboard' && stats && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>经营概览</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
              {[
                { icon: '📦', value: stats.totalProducts, label: '商品总数',  accent: 'var(--color-primary)' },
                { icon: '📈', value: stats.totalSold,     label: '已售数量',  accent: 'var(--color-success)' },
                { icon: '🛒', value: stats.totalOrders,   label: '订单总数',  accent: 'var(--color-warning)' },
                { icon: '⏳', value: stats.pendingOrders, label: '待支付',    accent: 'var(--color-accent)' },
                { icon: '✅', value: stats.paidOrders,    label: '已支付',    accent: 'var(--color-success)' },
              ].map((item, i) => (
                <div key={i} className="card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 38 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: item.accent, lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
                  </div>
                </div>
              ))}
              {/* Sales highlight */}
              <div className="card" style={{
                padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--gradient-primary)', color: 'white',
              }}>
                <div style={{ fontSize: 38 }}>💰</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>¥{stats.totalSales}</div>
                  <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4 }}>累计销售额</div>
                </div>
              </div>
            </div>

            {/* ===== 数据可视化 ===== */}
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '28px 0 16px', color: 'var(--text-primary)' }}>数据可视化</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
              {/* 销售额 + 订单趋势 */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>近 7 日销售趋势</div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={SALES_TREND} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#667eea" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#667eea" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                    <XAxis dataKey="d" tick={{ fontSize: 12, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8eaf0', fontSize: 12 }} />
                    <Area type="monotone" dataKey="销售额" stroke="#667eea" strokeWidth={2.5} fill="url(#gSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 分类占比饼图 */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>商品分类销量占比</div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={CATEGORY_PIE} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={52} outerRadius={84} paddingAngle={3}
                      label={(e: any) => `${e.name} ${e.value}%`} labelLine={false}
                      style={{ fontSize: 11 }}>
                      {CATEGORY_PIE.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8eaf0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 订单量柱状图 */}
            <div className="card" style={{ padding: '20px 22px', marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>近 7 日订单量</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SALES_TREND} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 12, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a0aec0' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(102,126,234,0.06)' }} contentStyle={{ borderRadius: 10, border: '1px solid #e8eaf0', fontSize: 12 }} />
                  <Bar dataKey="订单" fill="#764ba2" radius={[6, 6, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'rgba(102,126,234,0.06)', borderRadius: 'var(--border-radius)',
              fontSize: 13, color: 'var(--text-muted)',
            }}>
              💡 经营概览每 3 秒自动刷新；数据可视化为近期趋势示意
            </div>
          </div>
        )}

        {/* ========== Products ========== */}
        {activeTab === 'products' && (
          <div>
            <div className="section-header">
              <h3>商品列表</h3>
              <button className="btn btn-primary" onClick={() => setShowAddForm(v => !v)}>
                {showAddForm ? '收起' : '+ 发布商品'}
              </button>
            </div>

            {/* Add form */}
            {showAddForm && (
              <div className="card" style={{ padding: 24, marginBottom: 20, border: '2px dashed var(--border-color)' }}>
                <h4 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600 }}>🚀 发布秒杀商品</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">商品名称<span className="required">*</span></label>
                    <input
                      className="form-input"
                      type="text"
                      value={productForm.goodsName}
                      onChange={e => setProductForm(p => ({ ...p, goodsName: e.target.value }))}
                      placeholder="如：Apple iPhone 15 Pro 256GB 深空黑"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">秒杀价格（元）<span className="required">*</span></label>
                    <input
                      className="form-input"
                      type="number"
                      value={productForm.seckillPrice}
                      onChange={e => setProductForm(p => ({ ...p, seckillPrice: e.target.value }))}
                      placeholder="如：9.9"
                      step="0.01" min="0"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">库存数量<span className="required">*</span></label>
                    <input
                      className="form-input"
                      type="number"
                      value={productForm.stockCount}
                      onChange={e => setProductForm(p => ({ ...p, stockCount: e.target.value }))}
                      placeholder="如：100"
                      min="1"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">活动开始时间</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={productForm.startDate}
                      onChange={e => setProductForm(p => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">活动结束时间</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={productForm.endDate}
                      onChange={e => setProductForm(p => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">商品图片</label>
                    <ImageUpload
                      imageUrl={productForm.imageUrl}
                      uploading={imageUploading}
                      fileInputRef={addFileRef}
                      onSelect={e => handleImageUpload(e, 'add')}
                      onClear={() => setProductForm(p => ({ ...p, imageUrl: '' }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button className="btn btn-primary" onClick={handlePublishProduct} disabled={submitting}>
                    {submitting ? '发布中…' : '确认发布'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowAddForm(false)}>取消</button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 0' }}>
                  发布后商品立即对买家可见；不填写时间默认立即开始、7 天后结束
                </p>
              </div>
            )}

            {/* Products table */}
            <div style={{ background: 'white', borderRadius: 'var(--border-radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {products.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <h3>暂无商品</h3>
                  <p>点击「发布商品」开始添加秒杀商品</p>
                  <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>+ 发布商品</button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                    <thead>
                      <tr>
                        {['图片', '商品名称', '秒杀价', '库存', '已售', '状态', '开始时间', '结束时间', '操作'].map(h => (
                          <th key={h} style={{
                            padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600,
                            color: 'var(--text-muted)', background: '#fafafa',
                            borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr
                          key={p.id}
                          style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Image thumbnail */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                              background: `linear-gradient(135deg,hsl(${(Number(p.id) * 37) % 360},55%,86%),hsl(${(Number(p.id) * 37 + 50) % 360},55%,76%))`,
                            }}>
                              {p.imageUrl && (
                                <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, maxWidth: 200 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name || p.goodsName || `商品 #${p.id}`}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>ID: {p.id}</div>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--color-accent)', fontWeight: 700 }}>¥{p.seckillPrice}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.stockCount}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{p.soldCount ?? 0}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${getStatusClass(p.status)}`}>{getStatusText(p.status)}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(p.startDate)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(p.endDate)}</td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleEditClick(p)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 13, padding: '3px 8px', fontWeight: 500 }}
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 13, padding: '3px 8px', fontWeight: 500 }}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== Orders ========== */}
        {activeTab === 'orders' && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>订单列表</h3>
            <div style={{ background: 'white', borderRadius: 'var(--border-radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>暂无订单</h3>
                  <p>买家下单后将在此处显示</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                    <thead>
                      <tr>
                        {['订单号', '用户ID', '商品ID', '秒杀价', '实付金额', '状态', '下单时间', '支付时间'].map(h => (
                          <th key={h} style={{
                            padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600,
                            color: 'var(--text-muted)', background: '#fafafa',
                            borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr
                          key={o.id}
                          style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{o.id}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13 }}>{o.userId}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13 }}>{o.seckillId}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--color-accent)', fontWeight: 600 }}>¥{o.seckillPrice}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--color-accent)', fontWeight: 600 }}>¥{o.amount}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${getOrderStatusClass(o.status)}`}>{getOrderStatusText(o.status)}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(o.createTime)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(o.payTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== Edit modal ========== */}
      {showEditModal && editForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>✏️ 编辑商品</h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}
              >×</button>
            </div>

            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">商品 ID</label>
                <input className="form-input" value={editForm.id} disabled />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">秒杀价格（元）<span className="required">*</span></label>
                <input
                  className="form-input"
                  type="number"
                  value={editForm.seckillPrice}
                  onChange={e => setEditForm(p => p ? { ...p, seckillPrice: e.target.value } : p)}
                  step="0.01" min="0"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">当前库存</label>
                  <input className="form-input" value={editForm.stockCount} disabled />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">库存调整</label>
                  <input
                    className="form-input"
                    type="number"
                    value={editForm.stockChange}
                    onChange={e => setEditForm(p => p ? { ...p, stockChange: e.target.value } : p)}
                    placeholder="+10 增加 / -5 减少"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">开始时间</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={editForm.startDate}
                    onChange={e => setEditForm(p => p ? { ...p, startDate: e.target.value } : p)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">结束时间</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={editForm.endDate}
                    onChange={e => setEditForm(p => p ? { ...p, endDate: e.target.value } : p)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">商品图片</label>
                <ImageUpload
                  imageUrl={editForm.imageUrl}
                  uploading={editImageUploading}
                  fileInputRef={editFileRef}
                  onSelect={e => handleImageUpload(e, 'edit')}
                  onClear={() => setEditForm(p => p ? { ...p, imageUrl: '' } : p)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowEditModal(false); setEditForm(null); }}>取消</button>
              <button className="btn btn-primary" onClick={handleEditSubmit} disabled={submitting}>
                {submitting ? '保存中…' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AIChatWidget />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
