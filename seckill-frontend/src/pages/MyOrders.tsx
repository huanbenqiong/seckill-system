import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

interface Order {
  id: number;
  seckillId: number;
  seckillPrice: number;
  amount: number;
  status: number;
  createTime: string;
  payTime: string;
}

export const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('请先登录');
      navigate('/');
      return;
    }

    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/order/list');
      if (res && res.code === 200) {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error('获取订单列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return '待支付';
      case 1: return '已支付';
      case 2: return '已取消';
      case 3: return '已超时';
      default: return '未知';
    }
  };

  const getStatusClass = (status: number) => {
    switch (status) {
      case 0: return 'status-pending';
      case 1: return 'status-paid';
      case 2: return 'status-cancelled';
      case 3: return 'status-timeout';
      default: return '';
    }
  };

  const handlePay = async (orderId: number) => {
    if (!confirm('确认支付此订单？')) return;
    
    try {
      const res: any = await request.post(`/order/pay/${orderId}`);
      if (res && res.code === 200) {
        alert('支付成功！');
        fetchOrders();
      } else {
        alert(res?.message || '支付失败');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '支付失败');
    }
  };

  const handleCancel = async (orderId: number) => {
    if (!confirm('确认取消此订单？取消后将释放库存。')) return;
    
    try {
      const res: any = await request.post(`/order/cancel/${orderId}`);
      if (res && res.code === 200) {
        alert('订单已取消');
        fetchOrders();
      } else {
        alert(res?.message || '取消失败');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '取消失败');
    }
  };

  return (
    <div className="container">
      <header className="header">
        <button className="btn btn-outline" onClick={() => navigate('/goods')}>返回商品</button>
        <h2>我的订单</h2>
        <button className="btn btn-outline" onClick={() => { localStorage.clear(); navigate('/'); }}>退出</button>
      </header>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>暂无订单</p>
          <button className="btn btn-primary" onClick={() => navigate('/goods')}>
            去秒杀
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="card order-card">
              <div className="order-header">
                <span className="order-id">订单号: {order.id}</span>
                <span className={`order-status ${getStatusClass(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="order-body">
                <div className="order-info">
                  <p><strong>秒杀商品ID:</strong> {order.seckillId}</p>
                  <p><strong>秒杀价:</strong> <span className="price">￥{order.seckillPrice}</span></p>
                  <p><strong>订单金额:</strong> <span className="price">￥{order.amount}</span></p>
                  <p><strong>下单时间:</strong> {order.createTime ? new Date(order.createTime).toLocaleString() : '-'}</p>
                  {order.payTime && <p><strong>支付时间:</strong> {new Date(order.payTime).toLocaleString()}</p>}
                </div>
                <div className="order-actions">
                  {order.status === 0 && (
                    <>
                      <button className="btn btn-primary" onClick={() => handlePay(order.id)}>
                        立即支付
                      </button>
                      <button className="btn btn-outline" onClick={() => handleCancel(order.id)}>
                        取消订单
                      </button>
                    </>
                  )}
                  {order.status === 1 && (
                    <span className="success-text">支付完成</span>
                  )}
                  {(order.status === 2 || order.status === 3) && (
                    <span className="muted-text">订单已关闭</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .order-card {
          padding: 16px;
        }
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
          margin-bottom: 12px;
        }
        .order-id {
          font-size: 14px;
          color: #666;
        }
        .order-status {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 14px;
        }
        .status-pending {
          background: #fff7e6;
          color: #fa8c16;
        }
        .status-paid {
          background: #f6ffed;
          color: #52c41a;
        }
        .status-cancelled, .status-timeout {
          background: #f5f5f5;
          color: #999;
        }
        .order-body {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .order-info p {
          margin: 8px 0;
          color: #333;
        }
        .order-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 120px;
        }
        .success-text {
          color: #52c41a;
          font-weight: 500;
        }
        .muted-text {
          color: #999;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        .empty-state p {
          color: #999;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};
