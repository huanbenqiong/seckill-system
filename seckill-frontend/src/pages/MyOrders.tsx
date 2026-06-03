import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { Navbar } from '../components/Navbar';

interface Order {
  id: string;       // Long → 后端序列化为字符串，防止 JS 64位精度丢失
  seckillId: string;
  seckillPrice: number;
  amount: number;
  status: number;
  createTime: string;
  payTime: string;
}

interface PaymentForm {
  name: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  note: string;
}

const PROVINCES = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '陕西省', '山东省', '河南省', '其他'];

export const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const navigate = useNavigate();

  // 支付表单
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [payForm, setPayForm] = useState<PaymentForm>(() => {
    const saved = localStorage.getItem('lastPayForm');
    return saved ? JSON.parse(saved) : { name: '', phone: '', province: '广东省', city: '', address: '', note: '' };
  });

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/order/list');
      if (res?.code === 200) setOrders(res.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const openPayModal = (orderId: string) => {
    setPayingOrderId(orderId);
    setFormError('');
    setShowPayModal(true);
  };

  const validateForm = () => {
    if (!payForm.name.trim()) return '请填写收货人姓名';
    if (!/^1[3-9]\d{9}$/.test(payForm.phone)) return '请填写正确的手机号码';
    if (!payForm.city.trim()) return '请填写所在城市';
    if (!payForm.address.trim()) return '请填写详细地址';
    return '';
  };

  const handlePay = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!payingOrderId) return;

    // 保存收货信息到本地，方便下次自动填入
    localStorage.setItem('lastPayForm', JSON.stringify(payForm));

    setPaySubmitting(true);
    try {
      const res: any = await request.post(`/order/pay/${payingOrderId}`);
      if (res?.code === 200) {
        setShowPayModal(false);
        setPayingOrderId(null);
        alert('🎉 支付成功！');
        fetchOrders();
      } else {
        setFormError(res?.message || '支付失败');
      }
    } catch (e: any) {
      setFormError(e.response?.data?.message || '支付失败，请重试');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('确认取消此订单？取消后将释放库存。')) return;
    try {
      const res: any = await request.post(`/order/cancel/${orderId}`);
      if (res?.code === 200) {
        alert('订单已取消');
        fetchOrders();
      } else {
        alert(res?.message || '取消失败');
      }
    } catch (e: any) {
      alert(e.response?.data?.message || '取消失败');
    }
  };

  const getStatusText = (s: number) => ({ 0: '待支付', 1: '已支付', 2: '已取消', 3: '已超时' }[s] ?? '未知');
  const getStatusClass = (s: number) => ({ 0: 'badge-pending', 1: 'badge-paid', 2: 'badge-cancelled', 3: 'badge-cancelled' }[s] ?? '');
  const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-';

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => String(o.status) === statusFilter);

  const tabs: Array<{ key: typeof statusFilter; label: string; count?: number }> = [
    { key: 'all', label: '全部订单', count: orders.length },
    { key: '0', label: '待支付', count: orders.filter(o => o.status === 0).length },
    { key: '1', label: '已支付', count: orders.filter(o => o.status === 1).length },
    { key: '2', label: '已取消', count: orders.filter(o => o.status === 2).length },
  ];

  return (
    <div>
      <Navbar />

      <div className="orders-page">
        <h2 className="page-title">我的订单</h2>

        {/* 状态筛选 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '7px 18px',
                border: `1.5px solid ${statusFilter === tab.key ? 'var(--color-primary)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-full)',
                background: statusFilter === tab.key ? 'rgba(102,126,234,0.06)' : 'white',
                color: statusFilter === tab.key ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: statusFilter === tab.key ? 600 : 400,
                transition: 'var(--transition)',
              }}
            >
              {tab.label}
              {(tab.count ?? 0) > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: statusFilter === tab.key ? 'var(--color-primary)' : '#e8eaf0',
                  color: statusFilter === tab.key ? 'white' : 'var(--text-muted)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /><span>加载中...</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>暂无订单</h3>
            <p>去秒杀页面抢好货吧！</p>
            <button className="btn btn-primary" onClick={() => navigate('/goods')}>去秒杀</button>
          </div>
        ) : (
          <div>
            {filtered.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span className="order-id-text">订单号：{order.id}</span>
                    <span className={`badge ${getStatusClass(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <span className="order-time-text">下单时间：{formatDate(order.createTime)}</span>
                </div>

                <div className="order-card-body">
                  <div className="order-info-grid">
                    <div className="order-info-item">
                      <span className="order-info-label">商品 ID</span>
                      <span className="order-info-value">#{order.seckillId}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">秒杀价</span>
                      <span className="order-info-value price">¥{order.seckillPrice}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">实付金额</span>
                      <span className="order-info-value price">¥{order.amount}</span>
                    </div>
                    {order.payTime && (
                      <div className="order-info-item">
                        <span className="order-info-label">支付时间</span>
                        <span className="order-info-value">{formatDate(order.payTime)}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-actions">
                    {order.status === 0 && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => openPayModal(order.id)}>
                          立即支付
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleCancel(order.id)}>
                          取消订单
                        </button>
                      </>
                    )}
                    {order.status === 1 && (
                      <span style={{ color: 'var(--color-success)', fontSize: 13, fontWeight: 500 }}>✅ 已完成</span>
                    )}
                    {(order.status === 2 || order.status === 3) && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>订单已关闭</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 支付信息填写弹窗（Task 7）*/}
      {showPayModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPayModal(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>📦 填写收货信息</h3>
              <button
                onClick={() => setShowPayModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'rgba(102,126,234,0.06)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                💡 填写收货地址后完成支付，信息将自动保存方便下次使用
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">收货人姓名 <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={payForm.name}
                  onChange={e => setPayForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="请输入真实姓名"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">手机号码 <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="tel"
                  value={payForm.phone}
                  onChange={e => setPayForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="请输入11位手机号码"
                  maxLength={11}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">省/市 <span className="required">*</span></label>
                  <select
                    className="form-input form-select"
                    value={payForm.province}
                    onChange={e => setPayForm(p => ({ ...p, province: e.target.value }))}
                  >
                    {PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">城市/区县 <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={payForm.city}
                    onChange={e => setPayForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="如：深圳市南山区"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">详细地址 <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={payForm.address}
                  onChange={e => setPayForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="如：科技园路XX号XX大厦XX楼"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">备注（选填）</label>
                <input
                  className="form-input"
                  value={payForm.note}
                  onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="如：白天不在家，请电联"
                />
              </div>

              {formError && <div className="error-text" style={{ marginTop: 12, marginBottom: 0 }}>{formError}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPayModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handlePay} disabled={paySubmitting}>
                {paySubmitting ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                      style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    处理中...
                  </>
                ) : '💳 确认支付'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
