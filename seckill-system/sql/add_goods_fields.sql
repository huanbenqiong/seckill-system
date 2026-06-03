-- =====================================================
-- 迁移：为 sk_seckill_goods 添加 name 和 category 字段
-- 执行一次即可，勿重复执行
-- =====================================================

ALTER TABLE sk_seckill_goods
    ADD COLUMN `name`      VARCHAR(200) DEFAULT NULL COMMENT '商品名称' AFTER `status`,
    ADD COLUMN `category`  VARCHAR(50)  DEFAULT NULL COMMENT '商品分类' AFTER `name`,
   

-- =====================================================
-- 测试数据：34 条真实秒杀商品
-- 当前基准时间：2026-05-28
--   进行中(20)：start_date=2026-05-20，end_date=2026-06-15
--   准备中(8) ：start_date=2026-06-05，end_date=2026-06-20
--   已结束(6) ：start_date=2026-04-01，end_date=2026-05-10
-- =====================================================

INSERT INTO sk_seckill_goods
  (id, goods_id, seckill_price, stock_count, sold_count, start_date, end_date,
   timeout_seconds, limit_count, version, status, name, category, image_url,
   create_time, update_time)
VALUES

-- ======= 进行中（20 条） =======

(100001, 100001, 799.00,  200, 143, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 'Apple iPhone 15 Pro 256GB 深空黑', '手机数码',
 'https://loremflickr.com/400/400/iphone,smartphone,apple',
 NOW(), NOW()),

(100002, 100002, 899.00,  150,  82, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '华为 Mate 60 Pro+ 512GB 雅川青', '手机数码',
 'https://loremflickr.com/400/400/huawei,smartphone,android',
 NOW(), NOW()),

(100003, 100003, 699.00,  300, 201, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '小米 14 Ultra 摄影旗舰版 16+1TB', '手机数码',
 'https://loremflickr.com/400/400/xiaomi,smartphone,leica',
 NOW(), NOW()),

(100004, 100004, 999.00,  100,  67, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 'Samsung Galaxy S24 Ultra 钛灰 12+256GB', '手机数码',
 'https://loremflickr.com/400/400/samsung,galaxy,ultra,phone',
 NOW(), NOW()),

(100005, 100005, 199.00,  500, 312, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 'Apple AirPods Pro (第3代) USB-C版', '手机数码',
 'https://loremflickr.com/400/400/airpods,earbuds,apple,wireless',
 NOW(), NOW()),

(100006, 100006, 249.00,  200, 158, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '索尼 WH-1000XM5 无线主动降噪耳机 黑色', '手机数码',
 'https://loremflickr.com/400/400/sony,headphones,noise,canceling',
 NOW(), NOW()),

(100007, 100007, 399.00,  100,  63, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '戴森 V15 Detect+ 无绳智能吸尘器', '家用电器',
 'https://loremflickr.com/400/400/dyson,vacuum,cordless,cleaner',
 NOW(), NOW()),

(100008, 100008, 899.00,   50,  31, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '海尔 10KG 全自动变频滚筒洗衣机 EG100MATE8S', '家用电器',
 'https://loremflickr.com/400/400/washing,machine,drum,laundry',
 NOW(), NOW()),

(100009, 100009, 299.00,  200, 177, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '美的 KJ500G-E22 智能空气净化器 除甲醛版', '家用电器',
 'https://loremflickr.com/400/400/air,purifier,filter,clean',
 NOW(), NOW()),

(100010, 100010, 599.00,   80,  44, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '格力 1.5匹 新能效变频 云锦壁挂式空调 KFR-35GW', '家用电器',
 'https://loremflickr.com/400/400/air,conditioner,wall,unit',
 NOW(), NOW()),

(100011, 100011, 1299.00,  80,  26, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 'Apple MacBook Air 15英寸 M3 16GB+256GB 深空灰', '电脑办公',
 'https://loremflickr.com/400/400/macbook,air,apple,laptop',
 NOW(), NOW()),

(100012, 100012, 999.00,   60,  18, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '联想 ThinkPad X1 Carbon Gen 12 商务轻薄本', '电脑办公',
 'https://loremflickr.com/400/400/thinkpad,lenovo,laptop,business',
 NOW(), NOW()),

(100013, 100013,  49.00,  500, 389, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '罗技 MX Master 3S 无线鼠标 珍珠白', '电脑办公',
 'https://loremflickr.com/400/400/logitech,mouse,wireless,white',
 NOW(), NOW()),

(100014, 100014,  99.00, 1000, 724, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '优衣库 超轻保暖连帽羽绒服 男款 黑色 M-3XL', '服装鞋帽',
 'https://loremflickr.com/400/400/down,jacket,uniqlo,winter,coat',
 NOW(), NOW()),

(100015, 100015, 199.00,  300, 211, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 'Nike Air Force 1 低帮经典运动鞋 白色', '服装鞋帽',
 'https://loremflickr.com/400/400/nike,air,force,sneakers,white',
 NOW(), NOW()),

(100016, 100016, 199.00,  100,  77, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '帝王蟹 2只装 净重3KG 鲜活急冻 顺丰发货', '食品生鲜',
 'https://loremflickr.com/400/400/king,crab,seafood,fresh,gourmet',
 NOW(), NOW()),

(100017, 100017,  59.00,  500, 432, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '挪威进口三文鱼刺身 500g 冷链直达', '食品生鲜',
 'https://loremflickr.com/400/400/salmon,sashimi,fresh,seafood,fish',
 NOW(), NOW()),

(100018, 100018, 299.00,  200, 143, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '兰蔻 小黑瓶精华液 50ml 抗老修护', '美妆护肤',
 'https://loremflickr.com/400/400/lancome,serum,skincare,antiaging',
 NOW(), NOW()),

(100019, 100019, 199.00,  150,  98, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '迪卡侬 BTWIN 城市折叠山地自行车 20英寸', '运动户外',
 'https://loremflickr.com/400/400/bicycle,folding,urban,cycling',
 NOW(), NOW()),

(100020, 100020, 499.00,   80,  52, '2026-05-20 00:00:00', '2026-06-15 23:59:59', 900, 1, 0, 2, 0,
 '佳明 Forerunner 965 GPS专业跑步手表', '运动户外',
 'https://loremflickr.com/400/400/garmin,gps,running,watch,sport',
 NOW(), NOW()),

-- ======= 准备中（8 条）start_date 在未来 =======

(100021, 100021, 399.00,  200,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 '华为 Watch GT 5 Pro 钛金表壳 智能手表', '手机数码',
 'https://loremflickr.com/400/400/huawei,smartwatch,titanium',
 NOW(), NOW()),

(100022, 100022, 799.00,  100,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 '格力 1.5匹 云锦 Pro 新三级能效变频空调', '家用电器',
 'https://loremflickr.com/400/400/air,conditioner,inverter,cooling',
 NOW(), NOW()),

(100023, 100023, 199.00,  300,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 '九阳 Y88 多功能超静音破壁机 1.75L', '家用电器',
 'https://loremflickr.com/400/400/blender,joyoung,kitchen,smoothie',
 NOW(), NOW()),

(100024, 100024, 999.00,   50,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 '三星 27英寸 4K IPS USB-C 商务显示器', '电脑办公',
 'https://loremflickr.com/400/400/samsung,monitor,4k,display,screen',
 NOW(), NOW()),

(100025, 100025, 149.00,  800,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 "Levi's 501 经典直筒牛仔裤 男款 中蓝色", '服装鞋帽',
 'https://loremflickr.com/400/400/levis,jeans,denim,pants,fashion',
 NOW(), NOW()),

(100026, 100026,  29.00, 2000,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 '新疆和田玉枣特级大枣 1KG 无添加', '食品生鲜',
 'https://loremflickr.com/400/400/dates,dried,fruit,xinjiang,sweet',
 NOW(), NOW()),

(100027, 100027,  79.00,  500,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 '澳洲安格斯眼肉牛排 300g×3片 真空速冻', '食品生鲜',
 'https://loremflickr.com/400/400/angus,beef,steak,grill,marbled',
 NOW(), NOW()),

(100028, 100028, 1299.00,  30,   0, '2026-06-05 10:00:00', '2026-06-20 23:59:59', 900, 1, 0, 1, 0,
 '始祖鸟 Cerium SL 超轻900蓬鹅绒夹克 男款', '运动户外',
 'https://loremflickr.com/400/400/arcteryx,jacket,goose,down,outdoor',
 NOW(), NOW()),

-- ======= 已结束（6 条）end_date 在过去 =======

(100029, 100029, 399.00,  150, 150, '2026-04-01 00:00:00', '2026-05-10 23:59:59', 900, 1, 0, 3, 0,
 'DJI Osmo Action 4 4K运动相机套装', '手机数码',
 'https://loremflickr.com/400/400/dji,action,camera,sport,4k',
 NOW(), NOW()),

(100030, 100030,  59.00,  300, 298, '2026-04-01 00:00:00', '2026-05-10 23:59:59', 900, 1, 0, 3, 0,
 '飞利浦 HD9316 大容量不锈钢电热水壶 1.7L', '家用电器',
 'https://loremflickr.com/400/400/electric,kettle,philips,kitchen',
 NOW(), NOW()),

(100031, 100031, 699.00,  100,  97, '2026-04-01 00:00:00', '2026-05-10 23:59:59', 900, 1, 0, 3, 0,
 '北面 三合一防水保暖冲锋衣 男款 黑色 L', '服装鞋帽',
 'https://loremflickr.com/400/400/north,face,jacket,3in1,outdoor',
 NOW(), NOW()),

(100032, 100032, 199.00,  150, 150, '2026-04-01 00:00:00', '2026-05-10 23:59:59', 900, 1, 0, 3, 0,
 'SK-II 神仙水精华露 230ml 清爽型', '美妆护肤',
 'https://loremflickr.com/400/400/skii,toner,skincare,luxury,bottle',
 NOW(), NOW()),

(100033, 100033, 499.00,   30,  28, '2026-04-01 00:00:00', '2026-05-10 23:59:59', 900, 1, 0, 3, 0,
 '宜家 MALM 双人储物床架 白色 160×200cm', '家具家居',
 'https://loremflickr.com/400/400/ikea,bed,frame,furniture,bedroom',
 NOW(), NOW()),

(100034, 100034,  99.00,  200, 196, '2026-04-01 00:00:00', '2026-05-10 23:59:59', 900, 1, 0, 3, 0,
 '网易严选 泰国天然乳胶枕 护颈按摩枕 2支装', '家具家居',
 'https://loremflickr.com/400/400/latex,pillow,sleep,organic,natural',
 NOW(), NOW());
