# CLAUDE.md

本文件为 Claude Code 在此仓库工作时的参考指南。

---

## 项目简介

**秒杀系统（Seckill System）** —— 完整的电商秒杀平台，分为用户端（买家）和商家端（卖家），支持高并发秒杀场景，并内置 AI Agent 商家助手（数据分析 + 自动补货）。

项目目前已完成核心购买流程，正在迭代以下功能：AI-Agent 商家端增强、前端美化、用户体系完善、图片上传、商品搜索筛选、支付信息填写。

---

## 仓库目录结构

```
D:\seckill-system\
├── docker-compose.yml           # RocketMQ 基础设施（NameServer + Broker）
├── seckill-agent-python\        # Python AI Agent（LangChain + DeepSeek）
│   ├── main.py                  # FastAPI 服务入口（/agent/chat 接口）
│   ├── config.py                # API Key、后端地址、Agent Token 配置
│   ├── agent\agent.py           # LangChain Tool-Calling Agent 核心
│   └── tools\
│       ├── stock_tools.py       # 库存查询/补货工具（调用 admin-agent API）
│       └── data_tools.py        # 数据分析工具（销售统计/排行榜）
├── seckill-frontend\            # React 19 + TypeScript + Vite + Tailwind 前端
│   └── src\
│       ├── App.tsx              # 路由定义（当前路由见下文）
│       ├── index.css            # 全局样式（CSS 变量主题）
│       ├── pages\
│       │   ├── Login.tsx        # 登录/注册（买家/卖家角色选择）
│       │   ├── GoodsList.tsx    # 用户端商品列表（每5秒轮询库存）
│       │   ├── GoodsDetail.tsx  # 商品详情 + 秒杀按钮
│       │   ├── MyOrders.tsx     # 我的订单（查询/支付/取消）
│       │   └── SellerDashboard.tsx  # 商家控制台（统计/商品管理/订单/AI对话）
│       ├── components\
│       │   └── AIChatWidget.tsx  # 嵌入商家端的 AI 对话窗口
│       └── utils\
│           ├── request.ts       # Axios 封装（自动注入 Bearer Token + X-User-Id）
│           └── websocket.ts     # WebSocket 封装（库存实时推送）
└── seckill-system\              # Spring Cloud Alibaba 微服务后端（主工程）
    ├── pom.xml                  # 父 POM（依赖版本统一管理）
    ├── sql\01_schema.sql        # 数据库初始化脚本（含测试数据）
    ├── seckill-common\          # 公共模块（Result/ResultCode/JwtUtils/Redis常量等）
    ├── seckill-gateway\         # 网关服务（端口 8080）
    ├── seckill-user\            # 用户服务（端口 8081）
    ├── seckill-goods\           # 商品/秒杀服务（端口 8082）
    ├── seckill-order\           # 订单服务（端口 8083）
    └── seckill-admin-agent\     # 商家 Agent 数据接口服务（端口 8090）
```

---

## 技术栈

### 后端（Java）
| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 3.2.5 | 基础框架 |
| Spring Cloud Alibaba | 2023.0.1.2 | 微服务（Nacos 服务发现） |
| Spring Cloud Gateway | 2023.0.1 | 网关（JWT 鉴权、路由转发） |
| MyBatis-Plus | 3.5.6 | ORM |
| Redis (Lettuce) | Spring Boot 默认 | 库存缓存、Token 存储 |
| Redisson | 3.27.2 | 分布式锁 |
| RocketMQ | 2.2.0 | 消息队列（异步订单） |
| JJWT | 0.12.5 | JWT 生成/校验 |
| Druid | 1.2.21 | 数据库连接池 |
| Java | 17 | 语言版本 |

### 前端（TypeScript）
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| React Router DOM | 7 | 前端路由 |
| Vite | 8 | 构建工具 |
| Tailwind CSS | 4 | 样式 |
| Axios | 1.x | HTTP 请求 |
| Recharts | 3 | 数据图表（商家端） |
| Lucide React | 1.x | 图标库 |

### Python Agent
| 技术 | 用途 |
|------|------|
| LangChain + langchain_openai | Tool-Calling Agent 框架 |
| FastAPI | HTTP 接口暴露 |
| DeepSeek API (OpenAI 兼容) | 大语言模型 |

---

## 服务端口速查

| 服务 | 端口 | 数据库 | 说明 |
|------|------|--------|------|
| seckill-gateway | 8080 | — | 网关（所有前端请求的入口） |
| seckill-user | 8081 | seckill_system (3307) | 用户注册/登录/商家管理 |
| seckill-goods | 8082 | seckill_system (3307) | 商品列表/秒杀核心 |
| seckill-order | 8083 | seckill_system (3307) | 订单 CRUD |
| seckill-admin-agent | 8090 | seckill_db (3306) | Agent 数据查询/补货 API |
| Python Agent | 8000 | — | FastAPI，供前端 AIChatWidget 调用 |
| Frontend (dev) | 5173 | — | Vite dev server |
| Nacos | 8848 | — | 服务注册中心 |
| MySQL | 3307 | — | 主数据库 |
| Redis | 6379 | — | 缓存 |
| RocketMQ | 9876 | — | 消息队列 |

> **注意**：admin-agent 的 `application.yml` 中 DB 地址是 `localhost:3306/seckill_db`，与其他服务的 `127.0.0.1:3307/seckill_system` 不同，本地开发时需确认两套数据库环境都已启动，或统一修改配置。

---

## 网关路由规则

Gateway（8080）将 `/api/{prefix}/**` 路由至对应服务（StripPrefix=1 剥除 `/api`）：

| 前端请求路径 | 路由到 | 服务实际路径 |
|---|---|---|
| `/api/user/**` | seckill-user:8081 | `/user/**` |
| `/api/seller/**` | seckill-user:8081 | `/seller/**` |
| `/api/goods/**` | seckill-goods:8082 | `/goods/**` |
| `/api/order/**` | seckill-order:8083 | `/order/**` |

前端 `request.ts` 中 `baseURL` 已设为 `/api`，Vite 开发环境下需配置代理将 `/api` 转发至 `http://localhost:8080`。

---

## JWT 认证机制

认证在 **Gateway 层统一拦截**（`AuthFilter.java`）：

1. 提取 Token 优先级：`Authorization: Bearer <token>` → Cookie `token` → 查询参数 `token`（仅调试）
2. 验证通过后，向下游请求头注入：`X-User-Id`（Long 转字符串）、`X-Username`
3. 下游服务直接读 `@RequestHeader("X-User-Id")` 获取当前用户，无需重新解析 Token

**当前白名单路径**（无需 Token）：
```java
"/user/login", "/user/register",
"/goods/list", "/goods/detail",
"/seller/dashboard", "/seller/products", "/seller/orders", "/seller/statistics"
```

> ⚠️ 商家接口目前全部在白名单中（无 JWT 保护），后续迭代时需根据业务决策是否收紧。

**JWT 配置（JwtUtils.java）**：
- 密钥：`seckill-system-jwt-secret-key-must-be-at-least-256-bits-long-for-security`（硬编码，生产环境务必改为配置项）
- 有效期：24 小时
- Claims 字段：`userId`（Long）、`username`（String）

---

## 数据库表结构速查

数据库名：`seckill_system`，初始化脚本：`seckill-system/sql/01_schema.sql`

| 表名 | 服务 | 说明 |
|------|------|------|
| `sk_user` | user | 用户（含 `role` 字段: 0=买家, 1=卖家；`shop_name` 字段需确认是否已加列） |
| `sk_goods` | goods | 商品主表（`goods_name`, `goods_img`, `goods_price`, `goods_stock`） |
| `sk_seckill_goods` | goods | 秒杀活动表（`seckill_price`, `stock_count`, `sold_count`, 活动时间, `status`, 乐观锁 `version`） |
| `sk_order` | order | 订单主表（`status`: 0=待支付, 1=已支付, 2=已取消, 3=已超时；`delivery_addr_id` 预留） |
| `sk_seckill_order` | order | 秒杀防重索引表（`uk_user_goods` 唯一索引防止重复购买） |
| `sk_stock_log` | goods | 库存操作日志（对账用） |

> **重要**：`sk_user` 表的 SQL 脚本中**缺少** `role` 和 `shop_name` 列，但 `User.java` 实体中有这两个字段。需要执行 ALTER TABLE 补全，或确认本地 DB 已手动加过。参考语句：
> ```sql
> ALTER TABLE sk_user
>   ADD COLUMN role TINYINT NOT NULL DEFAULT 0 COMMENT '角色: 0-买家, 1-卖家',
>   ADD COLUMN shop_name VARCHAR(100) DEFAULT NULL COMMENT '店铺名称';
> ```

---

## 秒杀核心流程

`SeckillService.doSeckill(userId, goodsId)` 的执行步骤：

1. 查询商品是否存在
2. 确保 Redis 中已预热库存（`seckill:stock:{goodsId}`）和已售计数（`seckill:sold:{goodsId}`）
3. 检查活动状态（status=3 已结束则拒绝）
4. **Lua 脚本原子扣减 Redis 库存**（防超卖关键，返回 -1=库存不足, -2=key不存在）
5. 生成订单 ID（当前用 `System.currentTimeMillis()`，生产应改为雪花算法）
6. 写入 `sk_order` 表
7. 更新 DB 库存和已售（`updateStockAndSold`）
8. Redis 已售计数 +1
9. 异常时回滚 Redis 库存（+1）

**Redis Key 命名规范**（`RedisConstants.java`）：
- `seckill:stock:{goodsId}` — 实时库存
- `seckill:sold:{goodsId}` — 实时已售
- `user:token:{userId}` — 登录 Token（有效期由 `RedisConstants.TOKEN_EXPIRE` 控制）

---

## 统一响应格式

`Result<T>`（`seckill-common` 模块）：
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```
错误码由 `ResultCode` 枚举定义，自定义异常通过 `GlobalExceptionHandler` 统一捕获。

---

## AI Agent 架构

### Python Agent（`seckill-agent-python/`）
- 框架：LangChain `create_tool_calling_agent` + `AgentExecutor`
- 模型：DeepSeek (`deepseek-chat`)，OpenAI 兼容接口
- 工具集：`check_stock`、`get_low_stock_goods`、`add_stock`、`batch_restock`、`extend_activity_time`、`get_dashboard`、`get_goods_stats`、`get_sales_rank`、`get_all_goods`
- 入口：`main.py` FastAPI，路由 `/agent/chat`（POST）
- 配置：`config.py`（**注意：API Key 明文写在文件中，生产环境改用环境变量**）

### Java Admin Agent API（`seckill-admin-agent/`）
- 端口 8090，路径前缀 `/admin/api`
- 鉴权：请求头 `X-Agent-Token: seckill-agent-secret-key-2026`（与 Python `config.py` 对应）
- 主要接口：
  - `GET /admin/api/goods/{id}/stock` — 查询库存
  - `GET /admin/api/goods/low-stock?threshold=10` — 低库存商品
  - `POST /admin/api/goods/{id}/stock/add` — 追加库存
  - `POST /admin/api/goods/restock` — 批量补货
  - `GET /admin/api/data/dashboard` — 今日大盘
  - `GET /admin/api/data/goods/{id}/stats` — 单品统计
  - `GET /admin/api/data/sales-rank` — 销售排行
  - `POST /admin/api/goods/extend-time` — 批量延期活动

### 前端 AI 对话（`AIChatWidget.tsx`）
- 内嵌在 `SellerDashboard` 页面
- 调用 Python Agent 的 FastAPI 接口

---

## 前端路由（当前）

```
/           → Login（登录/注册，含买家/卖家角色选择）
/goods      → GoodsList（用户端商品列表）
/goods/:id  → GoodsDetail（商品详情 + 立即秒杀）
/orders     → MyOrders（我的订单）
/seller     → SellerDashboard（商家控制台）
*           → 重定向 /
```

---

## 本地启动流程

### 第一步：启动基础设施

```bash
# 启动 RocketMQ（项目根目录）
docker-compose up -d

# 另需手动启动：MySQL（3307）、Redis（6379）、Nacos（8848）
# 建议用 Docker 或本地安装
```

### 第二步：初始化数据库

```sql
-- 在 MySQL 3307 上执行
source seckill-system/sql/01_schema.sql
-- 然后补全缺失列（参考上方"重要"提示）
```

### 第三步：启动 Java 微服务（IDE 中按顺序）

```
1. GatewayApplication       (端口 8080)  seckill-gateway
2. UserApplication          (端口 8081)  seckill-user
3. GoodsApplication         (端口 8082)  seckill-goods
4. OrderApplication         (端口 8083)  seckill-order
5. SeckillAdminAgentApplication (端口 8090)  seckill-admin-agent
```

### 第四步：启动 Python Agent

```bash
cd seckill-agent-python
pip install -r requirements.txt
# 在 config.py 中填入真实的 DeepSeek API Key
python main.py
# 默认端口 8000
```

### 第五步：启动前端

```bash
cd seckill-frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 构建命令

```bash
# 构建所有 Java 微服务
cd seckill-system
./mvnw package -DskipTests

# 构建单个服务
cd seckill-system/seckill-goods
./mvnw package -DskipTests

# 前端构建
cd seckill-frontend
npm run build
```

---

## 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| TestUser | 123456 | 买家（ID: 100001） |
| Alice | 123456 | 买家（ID: 100002） |
| Bob | 123456 | 买家（ID: 100003） |

商家账号需自行注册（登录页选择"我是商家"，role=1）。

---

## 待完成功能清单

以下功能已在计划中，按优先级排列：

### P1 — 核心功能完善

#### 1. 用户登录注册优化
- **现状**：后端 `UserController` + `UserService` 已完整实现，前端 `Login.tsx` 也已完成基础功能
- **待做**：确认 `sk_user` 表已有 `role`、`shop_name` 列；商家注册时设置店铺名称逻辑（当前用 `@shop` 后缀作为触发条件，体验差）

#### 2. JWT 网页鉴权
- **现状**：网关 `AuthFilter` 已完整实现，`request.ts` 自动附带 Token
- **待做**：前端路由守卫（未登录直接跳 `/`），Token 过期自动刷新或提示重登录

#### 3. 用户个人信息页面
- **需新增路由**：`/profile` → `ProfilePage.tsx`
- **后端接口已有**：`GET /user/info`（读信息）、`PUT /user/update`（改昵称/头像/店铺名）
- **页面内容**：用户昵称、头像（显示 + 上传）、角色、店铺名（卖家）、注册时间、修改密码入口

#### 4. 商品搜索筛选功能（用户端）
- **现状**：`GET /goods/list` 无任何过滤参数，`GoodsList.tsx` 无搜索/筛选 UI
- **后端改造**：`GoodsController.getSeckillGoodsList()` 增加 `keyword`（名称模糊搜索）、`status`（活动状态过滤）、`sortBy`（价格/库存/时间）、`page`/`size`（分页）参数
- **前端改造**：`GoodsList.tsx` 顶部增加搜索栏 + 状态/排序筛选器
- **注意**：`SeckillGoods` 实体当前无 `goods_name`、`goods_img` 字段，需与 `sk_goods` 表 JOIN 或在实体中扩展字段

#### 5. 商品图片上传
- **现状**：前端商品卡片中图片区域是写死的灰色占位符（`商品图片`）
- **后端改造**：
  - `seckill-user` 或 `seckill-goods` 新增文件上传接口 `POST /goods/upload`（接收 `MultipartFile`，保存到 `uploads/` 目录或 OSS，返回访问 URL）
  - `SellerController.addProduct()` 接收 `imageUrl` 字段，写入 `sk_goods.goods_img`
- **前端改造**：
  - 商家发布商品表单增加图片上传控件（`<input type="file">`）
  - `GoodsList.tsx` 和 `GoodsDetail.tsx` 用真实 URL 显示图片（`<img src={goods.goodsImg} />`）

#### 6. 支付时详细信息填写
- **现状**：`doSeckill()` 直接秒杀下单，无任何收货信息
- **DB 改造**：`sk_order` 表增加字段：`receiver_name VARCHAR(50)`、`phone VARCHAR(20)`、`address VARCHAR(255)`
- **Order 实体改造**：同步增加三个字段
- **前端改造**：`GoodsDetail.tsx` 点击"立即秒杀"后弹出填写收货信息的 Modal，填写完毕后再提交秒杀请求
- **接口改造**：`POST /goods/seckill/{goodsId}` 接收 `receiverName`、`phone`、`address` 参数，传递给订单服务

### P2 — AI Agent 增强

- **商家端 AI 对话已基本完成**（`AIChatWidget.tsx` + Python Agent）
- **待增强**：
  - 多轮对话历史持久化（当前仅前端内存存储）
  - 补货操作二次确认弹窗（防止误操作）
  - Agent 回答中嵌入可视化图表（结合 Recharts）
  - 更多工具：设置商品下线/上线、修改活动时间的闭环操作

### P3 — 前端页面美化

- **现状**：已有基础 CSS 变量主题（`--primary-color: #e53935` 红色），Tailwind 已引入但页面仍以 `.btn`、`.card` 等 class 为主
- **建议方向**：
  - 统一改用 Tailwind utility classes，移除 `index.css` 中冗余样式
  - 商品卡片增加倒计时组件（活动结束时间倒数）
  - 加入骨架屏（Skeleton Loading）替换纯文字"加载中"
  - 商家端数据看板（Dashboard）用 Recharts 绘制销售趋势折线图、商品库存柱状图
  - 响应式优化（移动端适配）

---

## 注意事项与已知问题

1. **订单 ID 生成**：当前用 `System.currentTimeMillis()`，高并发下会冲突，应改为雪花算法（Common 模块中已有 `IdUtil` 可用）

2. **SellerGoods 实体重复**：`seckill-user` 模块中有 `SellerGoods.java` 和 `SellerOrder.java`，映射的是与 `seckill-goods` 相同的 DB 表（`sk_seckill_goods`、`sk_order`）。这是商家侧视图，不是另一张表，注意不要混淆。

3. **admin-agent 数据库**：`seckill-admin-agent/application.yml` 连接的是 `localhost:3306/seckill_db`，与其他服务的 `127.0.0.1:3307/seckill_system` 不一致，本地联调需特别注意。

4. **硬编码密钥**：`JwtUtils.java` 中 JWT Secret 是硬编码字符串，`config.py` 中 DeepSeek API Key 是明文。生产环境务必改为环境变量或配置中心。

5. **Long ID 精度**：数据库 ID 为 BIGINT（雪花算法），前端 JSON 解析时存在精度丢失风险（JS `Number.MAX_SAFE_INTEGER`）。当前 `System.currentTimeMillis()` 生成的 ID 在安全范围内，切换到真正雪花 ID 后需在实体类加 `@JsonSerialize(using = ToStringSerializer.class)` 注解。

6. **白名单过于宽松**：商家端所有接口（`/seller/**`）均在 Gateway 白名单中，实际未做 JWT 校验，下游依赖 `X-User-Id` 为空时返回错误。建议移出白名单，依赖网关统一鉴权。

7. **前端库存轮询**：`GoodsList.tsx` 每 5 秒、`SellerDashboard.tsx` 每 3 秒全量轮询数据，量大时会有性能问题，可考虑改用 WebSocket（`websocket.ts` 已有基础实现）。
