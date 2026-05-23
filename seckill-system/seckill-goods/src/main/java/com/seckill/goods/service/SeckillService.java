package com.seckill.goods.service;

import com.seckill.common.constant.MqConstants;
import com.seckill.common.constant.RedisConstants;
import com.seckill.common.exception.BusinessException;
import com.seckill.common.result.ResultCode;
import com.seckill.goods.entity.SeckillGoods;
import com.seckill.goods.feign.OrderFeignClient;
import com.seckill.goods.mapper.SeckillGoodsMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

/**
 * 秒杀服务 - 核心业务逻辑
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeckillService {

    private final SeckillGoodsMapper seckillGoodsMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final OrderFeignClient orderFeignClient;

    /**
     * Lua 脚本 - 原子性扣减库存
     */
    private static final DefaultRedisScript<Long> STOCK_DECREASE_SCRIPT;

    static {
        STOCK_DECREASE_SCRIPT = new DefaultRedisScript<>();
        STOCK_DECREASE_SCRIPT.setScriptText(
                "if redis.call('exists', KEYS[1]) == 1 then " +
                "    local stock = tonumber(redis.call('get', KEYS[1])) " +
                "    if stock > 0 then " +
                "        redis.call('decr', KEYS[1]) " +
                "        return stock - 1 " +
                "    else " +
                "        return -1 " +
                "    end " +
                "else " +
                "    return -2 " +
                "end"
        );
        STOCK_DECREASE_SCRIPT.setResultType(Long.class);
    }

    /**
     * 执行秒杀
     *
     * @param userId 用户ID
     * @param goodsId 商品ID
     * @return 订单ID
     */
    public String doSeckill(Long userId, Long goodsId) {
        // 1. 检查活动是否有效
        SeckillGoods goods = checkSeckillActivity(goodsId);

        // 2. 检查用户购买限制 (防止重复购买)
        checkUserPurchaseLimit(userId, goodsId);

        // 3. Redis 预扣减库存 (原子操作)
        long remainingStock = decreaseStock(goodsId);
        if (remainingStock < 0) {
            throw new BusinessException(ResultCode.SECKILL_STOCK_EMPTY);
        }

        try {
            // 4. 发送消息到 RocketMQ，异步创建订单
            String orderId = createOrderAsync(userId, goodsId, goods);

            // 5. 标记用户已购买
            markUserPurchased(userId, goodsId, goods);

            log.info("秒杀成功: userId={}, goodsId={}, orderId={}, remainingStock={}",
                    userId, goodsId, orderId, remainingStock);

            return orderId;
        } catch (Exception e) {
            // 如果创建订单失败，回滚库存
            rollbackStock(goodsId);
            log.error("创建订单失败，回滚库存: userId={}, goodsId={}", userId, goodsId, e);
            throw new BusinessException(ResultCode.ERROR, "创建订单失败，请重试");
        }
    }

    /**
     * 检查秒杀活动是否有效
     */
    private SeckillGoods checkSeckillActivity(Long goodsId) {
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;

        // 检查 Redis 中是否存在该商品的库存缓存
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(stockKey))) {
            // 缓存不存在，加载数据库中的商品信息
            SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
            if (goods == null) {
                throw new BusinessException("商品不存在");
            }

            // 预热缓存：将库存存入 Redis
            redisTemplate.opsForValue().set(stockKey, goods.getStockCount());
            return goods;
        }

        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods == null) {
            throw new BusinessException("商品不存在");
        }

        // 检查活动状态
        if (goods.getStatus() == 0) {
            throw new BusinessException(ResultCode.SECKILL_NOT_START);
        }
        if (goods.getStatus() == 2) {
            throw new BusinessException(ResultCode.SECKILL_ENDED);
        }

        // 检查活动时间
        long now = System.currentTimeMillis();
        if (now < goods.getStartTime().toInstant(java.time.ZoneId.systemDefault().getRules().getOffset(java.time.Instant.now())).toEpochMilli()) {
            throw new BusinessException(ResultCode.SECKILL_NOT_START);
        }
        if (now > goods.getEndTime().toInstant(java.time.ZoneId.systemDefault().getRules().getOffset(java.time.Instant.now())).toEpochMilli()) {
            throw new BusinessException(ResultCode.SECKILL_ENDED);
        }

        return goods;
    }

    /**
     * 检查用户购买限制
     */
    private void checkUserPurchaseLimit(Long userId, Long goodsId) {
        String purchasedKey = RedisConstants.SECKILL_USER_PURCHASED + goodsId + ":" + userId;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(purchasedKey))) {
            throw new BusinessException(ResultCode.SECKILL_REPEAT_ERROR);
        }
    }

    /**
     * 扣减库存 (使用 Lua 脚本保证原子性)
     */
    private long decreaseStock(Long goodsId) {
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        Long result = redisTemplate.execute(STOCK_DECREASE_SCRIPT, Collections.singletonList(stockKey));
        return result != null ? result : -2;
    }

    /**
     * 回滚库存
     */
    private void rollbackStock(Long goodsId) {
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        redisTemplate.opsForValue().increment(stockKey);
    }

    /**
     * 异步创建订单 (通过 RocketMQ)
     */
    private String createOrderAsync(Long userId, Long goodsId, SeckillGoods goods) {
        String orderId = generateOrderId();
        // 发送消息到 RocketMQ
        // 实际项目中使用 RocketMQTemplate 发送消息
        // rocketMQTemplate.asyncSend(MqConstants.SECKILL_ORDER_TOPIC + ":" + MqConstants.TAG_CREATE_ORDER, orderMessage);
        log.info("发送订单创建消息: orderId={}, userId={}, goodsId={}", orderId, userId, goodsId);
        return orderId;
    }

    /**
     * 标记用户已购买
     */
    private void markUserPurchased(Long userId, Long goodsId, SeckillGoods goods) {
        String purchasedKey = RedisConstants.SECKILL_USER_PURCHASED + goodsId + ":" + userId;
        // 设置过期时间 = 活动结束时间
        long expireSeconds = goods.getEndTime().toInstant(java.time.ZoneId.systemDefault().getRules().getOffset(java.time.Instant.now())).toEpochMilli() / 1000
                - System.currentTimeMillis() / 1000;
        redisTemplate.opsForValue().set(purchasedKey, "1", expireSeconds, TimeUnit.SECONDS);
    }

    /**
     * 生成订单ID
     */
    private String generateOrderId() {
        return "ORD" + System.currentTimeMillis() + String.format("%04d", (int) (Math.random() * 10000));
    }

    /**
     * 预热秒杀商品库存到 Redis
     */
    @Transactional(readOnly = true)
    public void preloadStockToRedis(Long goodsId) {
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods != null) {
            String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
            redisTemplate.opsForValue().set(stockKey, goods.getStockCount());
            log.info("预热库存成功: goodsId={}, stock={}", goodsId, goods.getStockCount());
        }
    }
}
