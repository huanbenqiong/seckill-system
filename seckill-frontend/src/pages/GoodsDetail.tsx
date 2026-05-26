import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import request from '../utils/request';

export const GoodsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [goods, setGoods] = useState<any>(null);
  const [status, setStatus] = useState<string>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('请先登录');
      navigate('/');
      return;
    }

    const fetchDetail = async () => {
      try {
        const res: any = await request.get(`/goods/detail/${id}`);
        if (res && res.data) {
          setGoods(res.data);
        }
      } catch (err) {
        console.error('获取商品详情失败', err);
      }
    };
    fetchDetail();
  }, [id, navigate]);

  const doSeckill = async () => {
    setStatus('waiting');
    setLoading(true);
    try {
      const res: any = await request.post(`/goods/seckill/${id}`);
      if (res && res.code === 200) {
        setStatus('success');
        alert(`秒杀成功！订单号: ${res.data}`);
        // 刷新库存
        const detailRes: any = await request.get(`/goods/detail/${id}`);
        if (detailRes && detailRes.data) {
          setGoods(detailRes.data);
        }
      } else {
        alert(res?.message || '秒杀失败');
        setStatus('failed');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '秒杀失败');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  if (!goods) return <div className="container">加载中...</div>;

  return (
    <div className="container">
      <header className="header">
        <button className="btn btn-outline" onClick={() => navigate('/goods')}>返回列表</button>
        <h2>商品详情</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/orders')}>我的订单</button>
          <button className="btn btn-outline" onClick={() => { localStorage.clear(); navigate('/'); }}>退出</button>
        </div>
      </header>
      <div className="card detail-card">
        <div style={{ width: '200px', height: '200px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          商品图片
        </div>
        <div className="detail-info">
          <h2>秒杀商品 ID: {goods.id}</h2>
          <div className="price-block">
            <span className="seckill-price">秒杀价: ￥{goods.seckillPrice}</span>
          </div>
          <p>剩余库存: {goods.stockCount}</p>
          <p>已售: {goods.soldCount || 0}</p>
          <p>活动时间: {goods.startDate ? new Date(goods.startDate).toLocaleString() : '-'} 至 {goods.endDate ? new Date(goods.endDate).toLocaleString() : '-'}</p>
          
          <div className="action-block">
            {status === 'waiting' || loading ? (
              <button className="btn btn-primary" disabled>秒杀处理中...</button>
            ) : status === 'success' ? (
              <button className="btn btn-success" disabled>秒杀成功</button>
            ) : goods.stockCount > 0 ? (
              <button className="btn btn-danger" onClick={doSeckill}>立即秒杀</button>
            ) : (
              <button className="btn btn-secondary" disabled>库存不足</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
