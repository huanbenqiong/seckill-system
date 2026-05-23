-- =========================================
-- 秒杀系统 V2.0 数据库初始化脚本
-- 设计原则：高可用、数据一致性、多层防护
--
-- 【设计亮点】
-- 1. 商品表与秒杀表分离，避免高并发锁竞争
-- 2. 秒杀订单表用 order_id 作为主键，简化设计
-- 3. 所有 ID 使用 BIGINT，预留雪花算法扩展
-- 4. 库存操作带条件+版本号，双重防超卖
-- 5. 超时时间字段化，方便配置管理
-- =========================================

-- ----------------------------
-- 1. 创建数据库
-- ----------------------------
CREATE DATABASE IF NOT EXISTS `seckill_system`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `seckill_system`;


-- ==========================================
-- 2. 用户服务 (seckill-user)
-- ==========================================
DROP TABLE IF EXISTS `sk_user`;

CREATE TABLE `sk_user` (
    -- 用户ID：使用雪花算法生成（BIGINT），不再使用自增
    `id` BIGINT NOT NULL COMMENT '用户ID（雪花算法生成）',

    -- 用户昵称
    `nickname` VARCHAR(100) NOT NULL COMMENT '用户昵称',

    -- 密码：MD5(MD5(明文+固定盐) + 随机盐)
    `password` VARCHAR(64) NOT NULL COMMENT '密码密文',

    -- 随机盐值
    `salt` VARCHAR(10) NOT NULL COMMENT '随机加密盐',

    -- 头像
    `head` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',

    -- 注册时间
    `register_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',

    -- 上次登录时间
    `last_login_date` DATETIME DEFAULT NULL COMMENT '上次登录时间',

    -- 登录次数
    `login_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '登录次数',

    -- 主键
    PRIMARY KEY (`id`),

    -- 用户昵称唯一
    UNIQUE KEY `uk_nickname` (`nickname`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';


-- ==========================================
-- 3. 商品服务 (seckill-goods)
-- ==========================================

-- ----------------------------
-- 3.1 商品主表（常规商品信息，读多写少）
-- ----------------------------
DROP TABLE IF EXISTS `sk_goods`;

CREATE TABLE `sk_goods` (
    -- 商品ID：使用雪花算法生成
    `id` BIGINT NOT NULL COMMENT '商品ID（雪花算法生成）',

    -- 商品名称
    `goods_name` VARCHAR(128) NOT NULL COMMENT '商品名称',

    -- 商品标题
    `goods_title` VARCHAR(256) DEFAULT NULL COMMENT '商品标题',

    -- 商品图片
    `goods_img` VARCHAR(255) DEFAULT NULL COMMENT '商品图片',

    -- 商品详情
    `goods_detail` LONGTEXT COMMENT '商品详情（富文本）',

    -- 商品原价
    `goods_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '商品原价',

    -- 常规库存（非秒杀库存，仅供参考）
    `goods_stock` INT NOT NULL DEFAULT 0 COMMENT '常规商品库存',

    -- 创建时间
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    -- 更新时间
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 主键
    PRIMARY KEY (`id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品主表';


-- ----------------------------
-- 3.2 秒杀商品活动表（高并发写入核心表）
-- ----------------------------
DROP TABLE IF EXISTS `sk_seckill_goods`;

CREATE TABLE `sk_seckill_goods` (
    -- 秒杀活动ID
    `id` BIGINT NOT NULL COMMENT '秒杀活动ID（雪花算法生成）',

    -- 关联的商品ID
    `goods_id` BIGINT NOT NULL COMMENT '关联的商品ID',

    -- 秒杀价格
    `seckill_price` DECIMAL(10,2) NOT NULL COMMENT '秒杀价格',

    -- 剩余秒杀库存数量
    `stock_count` INT NOT NULL DEFAULT 0 COMMENT '剩余秒杀库存',

    -- 已秒杀数量（用于统计和监控）
    `sold_count` INT NOT NULL DEFAULT 0 COMMENT '已秒杀数量',

    -- 秒杀活动开始时间
    `start_date` DATETIME NOT NULL COMMENT '秒杀开始时间',

    -- 秒杀活动结束时间
    `end_date` DATETIME NOT NULL COMMENT '秒杀结束时间',

    -- 订单超时时间（秒），默认15分钟
    `timeout_seconds` INT NOT NULL DEFAULT 900 COMMENT '订单超时时间(秒)',

    -- 每人限购数量
    `limit_count` INT NOT NULL DEFAULT 1 COMMENT '每人限购数量',

    -- 乐观锁版本号（防并发更新）
    `version` INT NOT NULL DEFAULT 0 COMMENT '版本号（乐观锁）',

    -- 状态：0-已下线，1-准备中，2-进行中，3-已结束
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-已下线, 1-准备中, 2-进行中, 3-已结束',

    -- 创建时间
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    -- 更新时间
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 主键
    PRIMARY KEY (`id`),

    -- 唯一索引：一个商品同一时间只能参与一个秒杀活动
    UNIQUE KEY `uk_goods_id` (`goods_id`),

    -- 普通索引：活动状态、时间范围
    KEY `idx_status` (`status`),
    KEY `idx_time_range` (`start_date`, `end_date`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='秒杀商品活动表';


-- ==========================================
-- 4. 订单服务 (seckill-order)
-- ==========================================

-- ----------------------------
-- 4.1 订单主表
-- ----------------------------
DROP TABLE IF EXISTS `sk_order`;

CREATE TABLE `sk_order` (
    -- 订单ID：使用雪花算法生成
    `id` BIGINT NOT NULL COMMENT '订单ID（雪花算法生成）',

    -- 用户ID
    `user_id` BIGINT NOT NULL COMMENT '用户ID',

    -- 商品ID
    `goods_id` BIGINT NOT NULL COMMENT '商品ID',

    -- 关联的秒杀活动ID
    `seckill_id` BIGINT DEFAULT NULL COMMENT '秒杀活动ID',

    -- 收货地址ID（预留）
    `delivery_addr_id` BIGINT DEFAULT NULL COMMENT '收货地址ID',

    -- 冗余商品名称（下单时快照）
    `goods_name` VARCHAR(128) NOT NULL COMMENT '商品名称（快照）',

    -- 冗余商品图片（下单时快照）
    `goods_img` VARCHAR(255) DEFAULT NULL COMMENT '商品图片（快照）',

    -- 购买数量
    `goods_count` INT NOT NULL DEFAULT 1 COMMENT '购买数量',

    -- 购买时的秒杀价格（下单时快照）
    `seckill_price` DECIMAL(10,2) NOT NULL COMMENT '秒杀价格（快照）',

    -- 订单总金额
    `total_amount` DECIMAL(10,2) NOT NULL COMMENT '订单总金额',

    -- 订单状态：0-待支付，1-已支付，2-已取消，3-已超时
    `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0-待支付, 1-已支付, 2-已取消, 3-已超时',

    -- 下单渠道：1-PC，2-App，3-H5
    `order_channel` TINYINT NOT NULL DEFAULT 1 COMMENT '下单渠道: 1-PC, 2-App, 3-H5',

    -- 订单超时时间（秒），从下单时确定
    `timeout_seconds` INT NOT NULL DEFAULT 900 COMMENT '订单超时时间(秒)',

    -- 订单创建时间
    `create_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '订单创建时间',

    -- 支付时间
    `pay_date` DATETIME DEFAULT NULL COMMENT '支付时间',

    -- 取消/超时时间
    `cancel_date` DATETIME DEFAULT NULL COMMENT '取消/超时时间',

    -- 主键
    PRIMARY KEY (`id`),

    -- 索引：用户ID、商品ID、状态、创建时间
    KEY `idx_user_id` (`user_id`),
    KEY `idx_goods_id` (`goods_id`),
    KEY `idx_status` (`status`),
    KEY `idx_create_date` (`create_date`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单主表';


-- ----------------------------
-- 4.2 秒杀订单快速索引表（防重复购买核心）
-- ----------------------------
-- 【简化设计】：直接用 order_id 作为主键，不再需要额外的自增ID
-- 联合唯一索引 (user_id, goods_id) 保证同一用户同一商品只能有一笔秒杀订单
-- 这是数据库层面的绝对防重，不依赖任何缓存
-- ----------------------------
DROP TABLE IF EXISTS `sk_seckill_order`;

CREATE TABLE `sk_seckill_order` (
    -- 订单ID：直接使用 sk_order 表的主键，一对一关系
    `order_id` BIGINT NOT NULL COMMENT '订单ID（关联 sk_order.id）',

    -- 用户ID
    `user_id` BIGINT NOT NULL COMMENT '用户ID',

    -- 商品ID
    `goods_id` BIGINT NOT NULL COMMENT '商品ID',

    -- 关联的秒杀活动ID
    `seckill_id` BIGINT NOT NULL COMMENT '秒杀活动ID',

    -- 创建时间
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    -- 主键 = 订单ID（简化设计，一对一关系）
    PRIMARY KEY (`order_id`),

    -- 【核心防重索引】：同一用户同一商品只能有一笔秒杀订单
    -- 注意：这里没有加 goods_id，因为 order_id 本身就是唯一的
    -- 但如果业务需要限制"同一用户对同一商品只能秒杀一次"，可以加：
    UNIQUE KEY `uk_user_goods` (`user_id`, `goods_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='秒杀订单索引表（防重）';


-- ==========================================
-- 5. 库存操作日志表（用于对账和回滚追踪）
-- ==========================================
DROP TABLE IF EXISTS `sk_stock_log`;

CREATE TABLE `sk_stock_log` (
    -- 日志ID
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '日志ID',

    -- 秒杀活动ID
    `seckill_id` BIGINT NOT NULL COMMENT '秒杀活动ID',

    -- 商品ID
    `goods_id` BIGINT NOT NULL COMMENT '商品ID',

    -- 操作类型：1-预扣减(成功)，2-预扣减(失败-库存不足)，3-确认扣减，4-库存回滚
    `operation_type` TINYINT NOT NULL COMMENT '操作类型: 1-预扣, 2-预扣失败, 3-确认, 4-回滚',

    -- 操作前库存
    `stock_before` INT NOT NULL COMMENT '操作前库存',

    -- 操作后库存
    `stock_after` INT NOT NULL COMMENT '操作后库存',

    -- 关联订单ID（可为空，库存不足时无订单）
    `order_id` BIGINT DEFAULT NULL COMMENT '关联订单ID',

    -- 关联用户ID（可为空）
    `user_id` BIGINT DEFAULT NULL COMMENT '关联用户ID',

    -- 备注
    `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',

    -- 创建时间
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    -- 主键
    PRIMARY KEY (`id`),

    -- 索引
    KEY `idx_seckill_id` (`seckill_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_create_time` (`create_time`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存操作日志表（对账用）';


-- ==========================================
-- 6. 初始化测试数据
-- ==========================================
BEGIN;

-- 6.1 插入测试用户
INSERT INTO `sk_user` (`id`, `nickname`, `password`, `salt`, `head`, `register_date`) VALUES
(100001, 'TestUser', 'b7797cce01b4b131b433b6acf4add449', '1a2b3c4d', NULL, NOW()),
(100002, 'Alice',   'b7797cce01b4b131b433b6acf4add449', 'a1b2c3d4', NULL, NOW()),
(100003, 'Bob',     'b7797cce01b4b131b433b6acf4add449', 'x9y8z7w6', NULL, NOW());

-- 6.2 插入测试商品
INSERT INTO `sk_goods` (`id`, `goods_name`, `goods_title`, `goods_img`, `goods_detail`, `goods_price`, `goods_stock`) VALUES
(200001, 'iPhone 15 Pro', 'Apple iPhone 15 Pro (A2848) 256GB 钛金属', '/img/iphone15.png', '苹果年度旗舰手机，A17 Pro芯片', 7999.00, 1000),
(200002, '拯救者 Y9000P', '联想(Lenovo)拯救者Y9000P 游戏本 14代酷睿i9', '/img/y9000p.png', '满血版电竞游戏本，RTX 4060', 9999.00, 500),
(200003, '小米14 Ultra', '小米14 Ultra 影像旗舰 16+512GB', '/img/xiaomi14.png', '徕卡影像，骁龙8 Gen3', 6999.00, 800);

-- 6.3 插入秒杀活动（开始时间设为当前时间，结束时间设为7天后）
INSERT INTO `sk_seckill_goods` (`id`, `goods_id`, `seckill_price`, `stock_count`, `sold_count`, `start_date`, `end_date`, `timeout_seconds`, `limit_count`, `status`) VALUES
(300001, 200001, 5999.00, 100, 0, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 900, 1, 2),
(300002, 200002, 8999.00, 50,  0, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 900, 1, 2),
(300003, 200003, 5499.00, 200, 0, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 8 DAY), 900, 1, 1);

COMMIT;


-- ==========================================
-- 7. 验证数据
-- ==========================================
SELECT '========== 用户表 ==========' AS '';
SELECT id, nickname, register_date FROM sk_user;

SELECT '========== 商品表 ==========' AS '';
SELECT id, goods_name, goods_price, goods_stock FROM sk_goods;

SELECT '========== 秒杀活动表 ==========' AS '';
SELECT id, goods_id, seckill_price, stock_count, sold_count, start_date, end_date,
       CASE status WHEN 0 THEN '已下线' WHEN 1 THEN '准备中' WHEN 2 THEN '进行中' WHEN 3 THEN '已结束' END AS status
FROM sk_seckill_goods;

SELECT '========== 订单表 ==========' AS '';
SELECT * FROM sk_order;

SELECT '========== 秒杀订单索引表 ==========' AS '';
SELECT * FROM sk_seckill_order;

SELECT '=========================================' AS '';
SELECT '  数据库初始化完成！' AS '';
SELECT '  数据库名: seckill_system' AS '';
SELECT '  测试用户: TestUser / 123456 (密码已MD5加密)' AS '';
SELECT '=========================================' AS '';
