import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UserLayout from './layouts/UserLayout'
import AdminLayout from './layouts/AdminLayout'
import HomePage from './pages/user/HomePage'
import ProductDetailPage from './pages/user/ProductDetailPage'
import OrderResultPage from './pages/user/OrderResultPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 买家端 */}
        <Route path="/" element={<UserLayout />}>
          <Route index element={<HomePage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="order/result" element={<OrderResultPage />} />
        </Route>
        {/* 商家管理端 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
