import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

interface Goods {
  id: number;
  goodsId: number;
  seckillPrice: number;
  stockCount: number;
  soldCount: number;
  startDate: string;
  endDate: string;
  status: number;
}

export const GoodsList: React.FC = () => {
  const [goodsList, setGoodsList] = useState<Goods[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }

    const fetchGoods = async () => {
      try {
        const res: any = await request.get('/goods/list');
        if (res && res.data) {
          setGoodsList(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch goods list', err);
      }
    };
    fetchGoods();

    // 每5秒自动刷新库存
    const interval = setInterval(fetchGoods, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return '已下线';
      case 1: return '准备中';
      case 2: return '进行中';
      case 3: return '已结束';
      default: return '未知';
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h2>秒杀商品列表</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/orders')}>我的订单</button>
          <button className="btn btn-outline" onClick={() => { localStorage.clear(); navigate('/'); }}>退出</button>
        </div>
      </header>
      <div className="goods-grid">
        {goodsList.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>暂无秒杀商品</p>
        ) : goodsList.map(goods => (
          <div key={goods.id} className="card goods-card">
            <div style={{ width: '100%', height: '150px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              商品图片
            </div>
            <div className="goods-info">
              <h3>秒杀商品 #{goods.id}</h3>
              <p className="price">
                <span className="seckill-price">￥{goods.seckillPrice}</span>
              </p>
              <p>库存: {goods.stockCount} | 已售: {goods.soldCount || 0}</p>
              <p>状态: <strong>{getStatusText(goods.status)}</strong></p>
              <p>结束时间: {goods.endDate ? new Date(goods.endDate).toLocaleString() : '-'}</p>
              <button 
                className="btn btn-primary full-width"
                onClick={() => navigate(`/goods/${goods.id}`)}
              >
                查看详情
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
