# 🚀 秒购前端项目 - 开发完成总结

## ✅ 项目已成功运行

**访问地址**：http://localhost:3000

---

## 🏗️ 项目结构

```
seckill-frontend/
├── index.html                    # SEO优化 + Inter字体 + 中文locale
├── vite.config.ts                # Vite + @tailwindcss/vite插件 + API代理
├── src/
│   ├── main.tsx                  # 入口文件
│   ├── App.tsx                   # React Router路由配置
│   ├── index.css                 # Tailwind v4全局样式 + 动画 + 设计Token
│   ├── types/
│   │   └── index.ts              # TypeScript类型定义（商品、订单、WebSocket）
│   ├── hooks/
│   │   ├── useWebSocket.ts       # WebSocket Hook (自动重连 + mock模式)
│   │   └── useCountdown.ts       # 倒计时 Hook
│   ├── data/
│   │   └── mockData.ts           # Mock数据（商品、订单、流量数据）
│   ├── components/
│   │   ├── CountdownTimer.tsx    # 数字倒计时组件 (sm/md/lg三种尺寸)
│   │   └── ProductCard.tsx       # 商品卡片（状态、库存进度、折扣标签）
│   ├── layouts/
│   │   ├── UserLayout.tsx        # 买家端布局（顶部导航栏）
│   │   └── AdminLayout.tsx       # 商家端布局（侧边栏导航）
│   └── pages/
│       ├── user/
│       │   ├── HomePage.tsx      # 首页（Hero + 商品网格 + 标签筛选）
│       │   ├── ProductDetailPage.tsx  # 商品详情 + 秒杀按钮 + WebSocket
│       │   └── OrderResultPage.tsx    # 订单结果 + 支付倒计时
│       └── admin/
│           ├── AdminDashboard.tsx # 管理总览（实时图表 + AI助手）
│           ├── AdminProducts.tsx  # 商品管理（表格 + 库存进度）
│           └── AdminOrders.tsx    # 订单管理（搜索 + 状态筛选）
```

---

## 🎨 设计系统（统一两端）

| Token | 值 | 说明 |
|-------|-----|------|
| 圆角 | 12px (rounded-xl) | 卡片、弹窗 |
| 按钮圆角 | 8px (rounded-lg) | 所有按钮 |
| 主要阴影 | `0 1px 3px rgb(0 0 0 / 0.05)` + `border-gray-100` | Apple/Vercel风格轻阴影 |
| 标题字重 | `font-semibold (600)` | 所有标题 |
| 正文字重 | `font-normal (400)` | 所有正文 |
| 主色 | `#F97316` (orange-500) | 秒杀品牌色 |
| AI助手色 | `#6366F1` (indigo-500) | AI聊天窗口 |
| 字体 | Inter + PingFang SC | 双语优雅字体 |

---

## 📱 页面一览

### 买家端 (/)
| 路由 | 页面 | 核心功能 |
|------|------|---------|
| `/` | 首页 | Hero Banner + 技术架构展示 + 商品网格 + 状态筛选 |
| `/product/:id` | 商品详情 | 数字倒计时 + 库存进度条 + 橙红秒杀按钮 + WebSocket实时同步 |
| `/order/result` | 订单结果 | 成功动效 + 15分钟支付倒计时 + 订单详情 |

### 商家端 (/admin)
| 路由 | 页面 | 核心功能 |
|------|------|---------|
| `/admin` | 数据总览 | 4个统计卡片 + 实时QPS面积图 + P99延迟柱状图 + AI助手聊天 |
| `/admin/products` | 商品管理 | 活动状态统计 + 商品数据表格 + 库存进度 |
| `/admin/orders` | 订单管理 | 搜索过滤 + 状态汇总 + 订单列表 |

---

## ⚡ 关键功能说明

### WebSocket 实时库存
- 商品详情页自动连接 `ws://localhost:8080/ws/seckill/{id}`
- 后端未启动时**静默失败**，不影响页面使用
- 连接成功时右下角显示"实时同步"绿色指示器

### AI 助手
- 支持关键词智能回复：`库存`、`流量`、`订单`、`限流`、`预热`、`风控`
- 快捷指令按钮一键发送
- 打字动画效果
- 聊天记录自动滚动到底部

### 实时流量图表
- 每 2 秒自动生成新数据点，模拟真实监控效果
- Area图显示QPS趋势 + 成功/失败分层
- Bar图显示P99延迟分布

---

## 🚀 如何运行

### 方式一：直接启动（推荐）

```bash
# 进入前端目录
cd d:\seckill-system\seckill-frontend

# 启动开发服务器
npm run dev
```

然后打开浏览器访问：
- **买家端** → http://localhost:3000
- **商家后台** → http://localhost:3000/admin

### 方式二：从零开始

```bash
cd d:\seckill-system\seckill-frontend
npm install
npm run dev
```

### 对接后端

当 Spring Cloud 后端启动后（Gateway 端口 8080），前端会自动通过 Vite proxy 转发 `/api/*` 请求，WebSocket 也会自动连接。

```
# 后端 API 代理（已在 vite.config.ts 中配置）
/api/* → http://localhost:8080/api/*
ws://localhost:8080/ws/* → 实时推送
```

---

## 📦 技术依赖

| 库 | 版本 | 用途 |
|----|------|------|
| React | 19 | UI框架 |
| TypeScript | 5 | 类型安全 |
| Vite | 8 | 构建工具 |
| Tailwind CSS | 4 | 原子化CSS |
| React Router | 7 | 路由管理 |
| Recharts | 2 | 数据图表 |
| Lucide React | latest | 图标库 |
| clsx | latest | 条件className |
