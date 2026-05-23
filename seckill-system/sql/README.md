# 秒杀系统 - 数据库初始化

## 文件说明

| 文件 | 说明 |
|------|------|
| `01_schema.sql` | 数据库建表脚本（包含初始化数据） |
| `db-config.properties` | 数据库连接配置文件 |
| `README.md` | 本说明文件 |

## 快速开始

### 方法一：命令行执行

```bash
mysql -u root -p1234
source sql/01_schema.sql
```

### 方法二：Navicat / DataGrip 等工具

1. 打开数据库工具
2. 新建连接，连接到本地 MySQL
3. 新建查询，执行 `01_schema.sql` 文件中的内容

### 方法三：IDEA 数据库控制台

1. 打开 IDEA 数据库控制台
2. 配置 MySQL 连接
3. 粘贴 `01_schema.sql` 内容并执行

---

## 数据库表结构总览

| 归属模块 | 表名 | 职责 |
|----------|------|------|
| seckill-user | `sk_user` | 用户基础信息表 |
| seckill-goods | `sk_goods` | 商品主表（读多写少） |
| seckill-goods | `sk_seckill_goods` | 秒杀活动表（高并发核心） |
| seckill-order | `sk_order` | 订单主表 |
| seckill-order | `sk_seckill_order` | 秒杀订单索引表（防重核心） |
| 全局 | `sk_stock_log` | 库存操作日志表（对账用） |

---

## 设计亮点（面试可展开）

### 1. 商品表与秒杀表分离

```
sk_goods（商品主表）──────────────► sk_seckill_goods（秒杀活动表）
┌─────────────────────┐           ┌──────────────────────────────┐
│ id                  │◄──────────│ goods_id (外键，唯一索引)      │
│ goods_name          │           │ seckill_price                 │
│ goods_price         │           │ stock_count (高频更新)         │
│ goods_detail        │           │ sold_count (统计)             │
│ goods_stock         │           │ version (乐观锁)              │
└─────────────────────┘           │ start_date / end_date         │
                                  │ timeout_seconds (可配置)      │
                                  └──────────────────────────────┘
```

**原因**：秒杀库存扣减是高频写入场景，与商品详情页的读操作拆开，避免行锁竞争。

### 2. 秒杀订单防重复购买（MySQL 唯一索引）

```sql
UNIQUE KEY `uk_user_goods` (`user_id`, `goods_id`)
```

这是数据库层面的**绝对防重**，不依赖 Redis。Redis 可能丢数据、可能崩溃，但 MySQL 唯一索引是最后一道防线。

### 3. 库存双重防超卖

**第一道防线（Redis）**：Lua 脚本原子扣减
**第二道防线（MySQL）**：乐观锁 + 条件扣减

```sql
UPDATE sk_seckill_goods
SET stock_count = stock_count - 1,
    sold_count = sold_count + 1,
    version = version + 1
WHERE id = ?
  AND stock_count > 0
  AND version = ?
```

### 4. 库存操作日志（对账机制）

`sk_stock_log` 记录每一次库存变更，用于：
- 数据对账：Redis 与 MySQL 不一致时溯源
- 问题排查：用户反馈没扣库存时可查日志
- 监控告警：库存异常变化时告警

### 5. 订单超时时间字段化

```sql
timeout_seconds INT NOT NULL DEFAULT 900  -- 15分钟
```

秒杀活动的超时时间可以不同，比写死更灵活。

---

## 测试账号

| 用户ID | 用户名 | 密码（明文） | 说明 |
|--------|--------|-------------|------|
| 100001 | TestUser | 123456 | 测试用户 |
| 100002 | Alice | 123456 | 测试用户 |
| 100003 | Bob | 123456 | 测试用户 |

> 密码加密方式：`MD5(MD5(明文密码 + 固定salt) + 随机salt)`
> 测试密码 `123456` 的加密结果存储在 `password` 字段中。

---

## 测试数据

- **3 个用户**：TestUser、Alice、Bob
- **3 个商品**：iPhone 15 Pro、拯救者 Y9000P、小米14 Ultra
- **3 个秒杀活动**：
  - iPhone：正在进行，库存 100，秒杀价 5999
  - 拯救者：正在进行，库存 50，秒杀价 8999
  - 小米14：明日开始，库存 200，秒杀价 5499

---

## 常见问题

### Q: 提示 "Unknown database"
**A**: 需要先执行 `01_schema.sql`，它会创建 `seckill_system` 数据库。

### Q: 表已存在报错
**A**: 使用 `DROP TABLE IF EXISTS` 会先删除再创建，不影响。

### Q: 中文乱码
**A**: 确保连接字符串包含 `characterEncoding=utf-8`。
