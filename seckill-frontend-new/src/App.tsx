import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoodsProvider } from './context/GoodsContext'
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
    <GoodsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UserLayout />}>
            <Route index element={<HomePage />} />
            <Route path="product/:id" element={<ProductDetailPage />} />
            <Route path="order/result" element={<OrderResultPage />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoodsProvider>
  )
}

export default App
