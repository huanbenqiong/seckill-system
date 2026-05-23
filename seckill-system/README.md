# 🚀 秒杀系统 (Seckill System)

> 基于 Spring Cloud Alibaba 微服务架构的高并发秒杀系统，具备多层防超卖、异步解耦、分布式限流等核心能力。

---

## 📖 项目简介

本项目是一个面向高并发场景的秒杀系统，采用 **微服务** 架构进行拆分，利用 **Redis + Lua 脚本** 进行原子性库存扣减，通过 **RocketMQ** 实现异步下单，结合 **Redisson 分布式锁** 防止重复下单，有效解决秒杀场景下的超卖、重复购买等核心问题。

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      客户端 (Client)                      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────┐
│              网关层  seckill-gateway :8080               │
│     ┌─────────────────┐   ┌───────────────────────┐     │
│     │  AuthFilter     │   │   RateLimitFilter      │     │
│     │  JWT 鉴权认证   │   │  IP 限流 / 秒杀限流    │     │
│     └─────────────────┘   └───────────────────────┘     │
└──────────┬────────────────────────────┬─────────────────┘
           │ lb://                      │ lb://
┌──────────▼──────────┐   ┌────────────▼──────────────────┐
│  seckill-user :8081 │   │   seckill-goods :8082          │
│  用户服务            │   │   商品/秒杀服务                 │
│  - 注册 / 登录       │   │   - 商品列表查询                │
│  - JWT Token 生成    │   │   - 秒杀流程（核心）            │
│  - Token 验证        │   │   - 库存预热到 Redis            │
└─────────────────────┘   └─────────────┬───────────────────┘
                                         │ RocketMQ
┌────────────────────────────────────────▼──────────────────┐
│                seckill-order :8083                         │
│                订单服务                                     │
│    - 异步消费消息，落库创建订单                              │
│    - Redisson 分布式锁防重复下单                            │
│    - RocketMQ 延时消息 → 订单超时自动取消                   │
└───────────────────────────────────────────────────────────┘

              ┌────────────┐   ┌────────────┐   ┌────────────┐
              │   MySQL    │   │   Redis    │   │  RocketMQ  │
              │  数据持久化 │   │  缓存/锁   │   │  消息队列  │
              └────────────┘   └────────────┘   └────────────┘

              ┌──────────────────────────────────────────────┐
              │              Nacos 注册 & 配置中心             │
              └──────────────────────────────────────────────┘
```

---

## 🧩 模块说明

| 模块 | 端口 | 说明 |
|------|------|------|
| `seckill-common` | — | 公共模块：统一返回、异常处理、常量、JWT 工具 |
| `seckill-gateway` | 8080 | 网关：路由转发、JWT 鉴权、限流过滤 |
| `seckill-user` | 8081 | 用户服务：注册、登录、Token 管理 |
| `seckill-goods` | 8082 | 商品/秒杀服务：核心秒杀流程、库存预热 |
| `seckill-order` | 8083 | 订单服务：异步创建订单、超时取消、支付 |

---

## ⚙️ 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Java | 17 | 编程语言 |
| Spring Boot | 3.2.5 | 基础框架 |
| Spring Cloud | 2023.0.1 | 微服务框架 |
| Spring Cloud Alibaba | 2023.0.1.2 | 阿里巴巴微服务组件 |

### 中间件

| 技术 | 版本 | 用途 |
|------|------|------|
| Nacos | — | 服务注册与发现、配置中心 |
| Redis (Lettuce) | — | 库存缓存、Token 缓存、分布式限流 |
| Redisson | 3.27.2 | 分布式锁（防重复下单） |
| RocketMQ | 2.2.0 | 异步消息队列（下单解耦、延时取消） |
| MySQL | 8.0.33 | 数据持久化 |
| Druid | 1.2.21 | 数据库连接池 |

### 其他组件

| 技术 | 版本 | 用途 |
|------|------|------|
| MyBatis-Plus | 3.5.6 | ORM 框架 |
| Sentinel | 1.8.8 | 熔断限流 |
| OpenFeign | — | 服务间 HTTP 调用 |
| JWT (jjwt) | 0.12.5 | 身份认证 Token |
| Hutool | 5.8.26 | Java 工具类库 |
| FastJson2 | 2.0.46 | JSON 序列化 |
| Lombok | 1.18.32 | 代码简化 |

---

## 🔑 核心秒杀流程

```
用户请求 → Gateway(鉴权+限流) → GoodsService.doSeckill()
    │
    ├── 1. 检查秒杀活动状态（时间、状态）
    ├── 2. 检查用户购买限制（Redis: seckill:purchased:{goodsId}:{userId}）
    ├── 3. Redis Lua 脚本原子扣减库存（seckill:stock:{goodsId}）
    │        └── 库存不足 → 直接返回失败（不打 DB）
    ├── 4. 发送 RocketMQ 消息（异步创建订单，解耦数据库压力）
    ├── 5. 标记用户已购买（防重复）
    └── 6. 返回订单号给用户

RocketMQ Consumer (OrderService)
    ├── Redisson 分布式锁（防并发重复入库）
    ├── 幂等检查（订单已存在则跳过）
    ├── 写入订单到 MySQL
    └── 发送 RocketMQ 延时消息（30s/自定义，超时未支付则取消）

订单超时取消
    ├── 消费延时消息
    ├── 更新订单状态为"已取消"
    └── 恢复 Redis 库存
```

---

## 🛡️ 防超卖与防重设计

| 层级 | 技术手段 | 说明 |
|------|----------|------|
| 网关层 | IP 限流（令牌桶） | 拦截恶意高频请求，秒杀接口限 50 QPS/IP |
| 缓存层 | Redis Lua 原子扣减 | `decr` 保证原子性，库存 ≤ 0 立即拒绝 |
| 缓存层 | 用户购买标记 | `seckill:purchased:{goodsId}:{userId}` 防重复 |
| 应用层 | Redisson 分布式锁 | 同一商品+用户并发请求只有一个能执行 |
| 数据库层 | 联合唯一索引 | `sk_seckill_order(user_id, goods_id)` 最终兜底 |
| 消息层 | RocketMQ 幂等消费 | 消费前检查订单是否已存在 |

---

## 🗄️ 数据库设计

数据库名：`seckill_system`

| 表名 | 说明 |
|------|------|
| `sk_user` | 用户表 |
| `sk_goods` | 商品主表（常规信息，读多写少） |
| `sk_seckill_goods` | 秒杀活动表（库存、时间、状态，带乐观锁版本号） |
| `sk_order` | 订单主表 |
| `sk_seckill_order` | 秒杀订单索引表（联合唯一索引防重） |
| `sk_stock_log` | 库存操作日志表（用于对账和追踪） |

---

## 📡 主要 API 接口

### 网关统一前缀：`http://localhost:8080/api`

#### 用户服务 `/api/user`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|------------|
| POST | `/user/login` | 用户登录，返回 JWT Token | ❌ |
| POST | `/user/register` | 用户注册 | ❌ |
| POST | `/user/logout` | 退出登录 | ✅ |

#### 商品服务 `/api/goods`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|------------|
| GET | `/goods/list` | 获取秒杀商品列表 | ❌ |
| GET | `/goods/detail/{goodsId}` | 获取商品详情 | ❌ |
| POST | `/goods/seckill/{goodsId}` | **执行秒杀** | ✅ |
| POST | `/goods/preload/{goodsId}` | 预热商品库存到 Redis（管理员） | ✅ |

#### 订单服务 `/api/order`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|------------|
| GET | `/order/{orderId}` | 查询订单详情 | ✅ |
| POST | `/order/pay/{orderId}` | 支付订单 | ✅ |

> **认证方式**：在请求头中携带 `Authorization: Bearer <token>`

---

## 🚀 快速启动

### 环境依赖

请确保以下服务已启动并可用：

- **Java 17+**
- **Maven 3.8+**
- **MySQL 8.0+**（端口 3306，数据库 `seckill_system`）
- **Redis**（端口 6379）
- **Nacos**（端口 8848，命名空间 `dev`，分组 `seckill-group`）
- **RocketMQ**（NameServer 端口 9876）

### 第一步：初始化数据库

```bash
mysql -u root -p < sql/01_schema.sql
```

> 初始化后将创建以下测试数据：
> - 测试用户：`TestUser` / `Alice` / `Bob`（密码均为 `123456`）
> - 测试商品：iPhone 15 Pro / 拯救者 Y9000P / 小米14 Ultra
> - 秒杀活动：前两个商品正在进行中，第三个处于准备中

### 第二步：构建项目

```bash
cd seckill-system
mvn clean package -DskipTests
```

### 第三步：按顺序启动服务

```bash
# 1. 启动公共模块（本地安装）
mvn install -pl seckill-common -DskipTests

# 2. 启动网关
java -jar seckill-gateway/target/seckill-gateway-1.0.0.jar

# 3. 启动用户服务
java -jar seckill-user/target/seckill-user-1.0.0.jar

# 4. 启动商品服务
java -jar seckill-goods/target/seckill-goods-1.0.0.jar

# 5. 启动订单服务
java -jar seckill-order/target/seckill-order-1.0.0.jar
```

### 第四步：验证服务

```bash
# 测试网关健康检查
curl http://localhost:8080/actuator/health

# 测试用户登录
curl -X POST http://localhost:8080/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"TestUser","password":"123456"}'
```

---

## 📁 项目结构

```
seckill-system/
├── pom.xml                        # 父工程 POM，统一管理依赖版本
├── sql/
│   ├── 01_schema.sql              # 数据库建表脚本 + 初始化数据
│   ├── db-config.properties       # 数据库连接配置参考
│   └── README.md                  # SQL 使用说明
├── seckill-common/                # 公共模块
│   └── src/main/java/com/seckill/common/
│       ├── config/                # 公共配置（MyBatis-Plus 自动填充等）
│       ├── constant/
│       │   ├── MqConstants.java   # RocketMQ Topic/Tag/Group 常量
│       │   └── RedisConstants.java# Redis Key 前缀 + 过期时间常量
│       ├── exception/
│       │   ├── BusinessException.java     # 业务异常
│       │   └── GlobalExceptionHandler.java# 全局异常处理
│       ├── result/
│       │   ├── Result.java        # 统一响应体
│       │   └── ResultCode.java    # 状态码枚举
│       └── utils/
│           └── JwtUtils.java      # JWT 生成与验证
├── seckill-gateway/               # 网关服务
│   └── src/main/
│       ├── java/com/seckill/gateway/
│       │   ├── GatewayApplication.java
│       │   └── filter/
│       │       ├── AuthFilter.java        # JWT 鉴权过滤器（Order=-100）
│       │       └── RateLimitFilter.java   # 限流过滤器（Order=-99）
│       └── resources/application.yml      # 路由配置 + Nacos 配置
├── seckill-user/                  # 用户服务
│   └── src/main/java/com/seckill/user/
│       ├── UserApplication.java
│       ├── controller/UserController.java
│       ├── service/UserService.java       # 登录/注册/Token 管理
│       ├── entity/User.java
│       ├── mapper/UserMapper.java
│       └── dto/
│           ├── LoginRequest.java
│           └── LoginResponse.java
├── seckill-goods/                 # 商品/秒杀服务（核心）
│   └── src/main/java/com/seckill/goods/
│       ├── GoodsApplication.java
│       ├── controller/GoodsController.java
│       ├── service/SeckillService.java    # 秒杀核心逻辑
│       ├── entity/SeckillGoods.java
│       ├── mapper/SeckillGoodsMapper.java
│       └── feign/OrderFeignClient.java    # 调用订单服务 Feign 客户端
└── seckill-order/                 # 订单服务
    └── src/main/java/com/seckill/order/
        ├── OrderApplication.java
        ├── controller/OrderController.java
        ├── service/OrderService.java      # 订单创建/取消/支付逻辑
        ├── mq/OrderMessageConsumer.java   # RocketMQ 消息消费者
        ├── entity/Order.java
        ├── mapper/OrderMapper.java
        └── feign/GoodsFeignClient.java    # 调用商品服务 Feign 客户端
```

---

## 🔧 配置说明

### 各服务端口

| 服务 | 端口 |
|------|------|
| Gateway | 8080 |
| User Service | 8081 |
| Goods Service | 8082 |
| Order Service | 8083 |
| Nacos | 8848 |
| RocketMQ NameServer | 9876 |
| Redis | 6379 |
| MySQL | 3306 |
| Sentinel Dashboard | 8858 |

### 关键 Redis Key 说明

| Key 模式 | 说明 |
|----------|------|
| `seckill:stock:{goodsId}` | 秒杀商品库存计数 |
| `seckill:purchased:{goodsId}:{userId}` | 用户购买标记（防重复） |
| `user:token:{userId}` | 用户 Token 缓存（24小时） |
| `lock:seckill:{goodsId}:{userId}` | Redisson 分布式锁 Key |

### RocketMQ Topic/Tag

| Topic | Tag | 用途 |
|-------|-----|------|
| `seckill-order-topic` | `create_order` | 异步创建订单 |
| `seckill-order-topic` | `cancel_order` | 延时消息 → 超时取消订单 |
| `seckill-order-topic` | `pay_success` | 支付成功通知 |

---

## 📊 性能设计亮点

1. **Redis 预热**：秒杀开始前通过 `/goods/preload/{goodsId}` 将库存载入 Redis，秒杀过程完全在内存层完成库存扣减，数据库零压力。

2. **Lua 脚本原子性**：库存扣减使用 Lua 脚本在 Redis 中原子执行，单线程特性保证无竞态条件。

3. **异步下单**：通过 RocketMQ 将秒杀请求与数据库写入解耦，秒杀接口响应时间 < 10ms，订单异步落库。

4. **多层防超卖**：Redis 原子扣减 → 用户购买标记 → Redisson 分布式锁 → 数据库唯一索引，四道防线。

5. **延时消息取消订单**：RocketMQ 延时消息（Level 4 ≈ 30秒，可配置）自动关闭超时未支付订单并恢复库存。

6. **令牌桶限流**：网关层对秒杀接口按 IP 进行限流（50 QPS），普通接口 100 QPS，防止流量洪峰击垮后端。

---

## 🐛 已知待优化项

- [ ] `AuthFilter` 中 JWT 验证为简化实现，需集成 `JwtUtils` 完整验证逻辑
- [ ] `RateLimitFilter` 令牌桶算法为 TODO，需使用 Redisson 或 Redis Lua 实现
- [ ] `SeckillService.createOrderAsync()` 中 RocketMQ 发送逻辑需解注释并完善
- [ ] 缺少 Nacos 配置文件，需补充各服务在 Nacos 中的配置
- [ ] 订单 ID 生成方案需替换为雪花算法（当前为时间戳+随机数）
- [ ] 需补充单元测试和集成测试
- [ ] 建议添加 Swagger/OpenAPI 文档

---

## 📄 License

本项目仅供学习与参考使用。
