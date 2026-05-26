import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { GoodsList } from './pages/GoodsList';
import { GoodsDetail } from './pages/GoodsDetail';
import { MyOrders } from './pages/MyOrders';
import { SellerDashboard } from './pages/SellerDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/goods" element={<GoodsList />} />
        <Route path="/goods/:id" element={<GoodsDetail />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
