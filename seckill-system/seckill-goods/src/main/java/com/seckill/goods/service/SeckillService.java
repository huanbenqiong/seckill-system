package com.seckill.goods.service;

import com.seckill.common.constant.RedisConstants;
import com.seckill.common.exception.BusinessException;
import com.seckill.common.result.ResultCode;
import com.seckill.goods.entity.Order;
import com.seckill.goods.entity.SeckillGoods;
import com.seckill.goods.mapper.OrderMapper;
import com.seckill.goods.mapper.SeckillGoodsMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 秒杀服务 - 核心业务逻辑
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeckillService {

    private final SeckillGoodsMapper seckillGoodsMapper;
    private final OrderMapper orderMapper;
    private final RedisTemplate<String, Object> redisTemplate;

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
     * 获取秒杀商品列表（实时库存和已售）
     */
    public List<SeckillGoods> getGoodsList() {
        List<SeckillGoods> list = seckillGoodsMapper.selectList(null);
        for (SeckillGoods goods : list) {
            String stockKey = RedisConstants.SECKILL_STOCK + goods.getId();
            String soldKey = RedisConstants.SECKILL_SOLD + goods.getId();

            // 实时库存
            Object stock = redisTemplate.opsForValue().get(stockKey);
            if (stock != null) {
                goods.setStockCount(Integer.parseInt(stock.toString()));
            }

            // 实时已售（从 Redis 读取，否则从 DB）
            Object sold = redisTemplate.opsForValue().get(soldKey);
            if (sold != null) {
                goods.setSoldCount(Integer.parseInt(sold.toString()));
            } else if (goods.getSoldCount() != null && goods.getSoldCount() > 0) {
                // DB 有已售但 Redis 没有，预热到 Redis
                redisTemplate.opsForValue().set(soldKey, goods.getSoldCount());
            }
        }
        return list;
    }

    /**
     * 获取秒杀商品详情
     */
    public SeckillGoods getGoodsDetail(Long goodsId) {
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods == null) {
            throw new BusinessException("商品不存在");
        }

        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        String soldKey = RedisConstants.SECKILL_SOLD + goodsId;

        // 实时库存
        Object stock = redisTemplate.opsForValue().get(stockKey);
        if (stock != null) {
            goods.setStockCount(Integer.parseInt(stock.toString()));
        } else if (goods.getStockCount() != null && goods.getStockCount() > 0) {
            redisTemplate.opsForValue().set(stockKey, goods.getStockCount());
        }

        // 实时已售
        Object sold = redisTemplate.opsForValue().get(soldKey);
        if (sold != null) {
            goods.setSoldCount(Integer.parseInt(sold.toString()));
        } else if (goods.getSoldCount() != null && goods.getSoldCount() > 0) {
            redisTemplate.opsForValue().set(soldKey, goods.getSoldCount());
        }

        return goods;
    }

    /**
     * 执行秒杀
     */
    @Transactional(rollbackFor = Exception.class)
    public String doSeckill(Long userId, Long goodsId) {
        log.info("开始秒杀: userId={}, goodsId={}", userId, goodsId);

        // 1. 检查商品是否存在
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods == null) {
            throw new BusinessException("商品不存在");
        }

        // 2. 预热库存和已售到 Redis
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        String soldKey = RedisConstants.SECKILL_SOLD + goodsId;
        ensureRedisInitialized(goodsId, goods, stockKey, soldKey);

        // 3. 检查活动状态
        if (goods.getStatus() != null && goods.getStatus() == 3) {
            throw new BusinessException(ResultCode.SECKILL_ENDED);
        }

        // 4. 扣减库存
        Long result = redisTemplate.execute(STOCK_DECREASE_SCRIPT, Collections.singletonList(stockKey));
        long remainingStock = result != null ? result : -2;

        if (remainingStock < 0) {
            log.warn("库存不足或不存在: goodsId={}, result={}", goodsId, remainingStock);
            throw new BusinessException(ResultCode.SECKILL_STOCK_EMPTY);
        }

        log.info("库存扣减成功: goodsId={}, remainingStock={}", goodsId, remainingStock);

        try {
            // 6. 生成订单ID
            Long orderId = generateOrderId();

            // 7. 创建订单
            Order order = new Order();
            order.setId(orderId);
            order.setUserId(userId);
            order.setSeckillId(goodsId);
            order.setSeckillPrice(goods.getSeckillPrice());
            order.setAmount(goods.getSeckillPrice());
            order.setStatus(0);

            orderMapper.insert(order);
            log.info("订单创建成功: orderId={}", orderId);

            // 8. 同步更新数据库库存和已售
            updateGoodsStockAndSold(goodsId);

            // 9. Redis 中增加已售数量
            redisTemplate.opsForValue().increment(soldKey);
            log.info("Redis已售+1: goodsId={}", goodsId);

            // 10. 标记用户已购买（允许多次购买，取消订单后可重新秒杀）
            // markUserPurchased(userId, goodsId, goods);

            log.info("秒杀成功: userId={}, goodsId={}, orderId={}", userId, goodsId, orderId);
            return String.valueOf(orderId);

        } catch (Exception e) {
            // 回滚库存
            redisTemplate.opsForValue().increment(stockKey);
            log.error("秒杀异常，回滚库存: userId={}, goodsId={}", userId, goodsId, e);
            throw new BusinessException(ResultCode.ERROR, "秒杀失败，请重试: " + e.getMessage());
        }
    }

    /**
     * 确保 Redis 中初始化了库存和已售
     */
    private void ensureRedisInitialized(Long goodsId, SeckillGoods goods, String stockKey, String soldKey) {
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(stockKey))) {
            if (goods.getStockCount() != null && goods.getStockCount() > 0) {
                redisTemplate.opsForValue().set(stockKey, goods.getStockCount());
                log.info("预热库存: goodsId={}, stock={}", goodsId, goods.getStockCount());
            }
        }
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(soldKey))) {
            int soldCount = goods.getSoldCount() != null ? goods.getSoldCount() : 0;
            redisTemplate.opsForValue().set(soldKey, soldCount);
            log.info("预热已售: goodsId={}, sold={}", goodsId, soldCount);
        }
    }

    private Long generateOrderId() {
        return System.currentTimeMillis();
    }

    /**
     * 更新数据库库存和已售数量（原子操作）
     */
    private void updateGoodsStockAndSold(Long goodsId) {
        seckillGoodsMapper.updateStockAndSold(goodsId);
        log.info("数据库库存-1，已售+1: goodsId={}", goodsId);
    }

    /**
     * 预热秒杀商品库存到 Redis
     */
    public void preloadStockToRedis(Long goodsId) {
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods != null) {
            String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
            String soldKey = RedisConstants.SECKILL_SOLD + goodsId;
            redisTemplate.opsForValue().set(stockKey, goods.getStockCount() != null ? goods.getStockCount() : 0);
            redisTemplate.opsForValue().set(soldKey, goods.getSoldCount() != null ? goods.getSoldCount() : 0);
            log.info("预热 Redis 成功: goodsId={}, stock={}, sold={}",
                    goodsId, goods.getStockCount(), goods.getSoldCount());
        }
    }

    /**
     * 恢复数据库库存（内部调用）
     */
    public void restoreStockInDb(Long goodsId) {
        seckillGoodsMapper.updateStockAndSoldCancel(goodsId);
        log.info("数据库库存已恢复: goodsId={}", goodsId);
    }
}
