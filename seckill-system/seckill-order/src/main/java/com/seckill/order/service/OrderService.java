package com.seckill.order.service;

import com.seckill.common.constant.MqConstants;
import com.seckill.common.constant.RedisConstants;
import com.seckill.common.exception.BusinessException;
import com.seckill.common.result.ResultCode;
import com.seckill.order.entity.Order;
import com.seckill.order.mapper.OrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.concurrent.TimeUnit;

/**
 * 订单服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderMapper orderMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedissonClient redissonClient;
    private final RocketMQTemplate rocketMQTemplate;

    /**
     * 创建秒杀订单
     */
    @Transactional(rollbackFor = Exception.class)
    public void createSeckillOrder(Long userId, Long goodsId, String orderId,
                                   String goodsName, String goodsImage,
                                   BigDecimal seckillPrice, Integer quantity) {
        // 获取分布式锁，防止重复下单
        String lockKey = RedisConstants.LOCK_SECKILL + goodsId + ":" + userId;
        RLock lock = redissonClient.getLock(lockKey);

        try {
            // 尝试获取锁，最多等待3秒，锁自动过期时间30秒
            if (!lock.tryLock(3, 30, TimeUnit.SECONDS)) {
                throw new BusinessException(ResultCode.SECKILL_ILLEGAL_REQUEST);
            }

            // 再次检查是否已存在订单
            if (checkOrderExists(orderId)) {
                log.warn("订单已存在: orderId={}", orderId);
                return;
            }

            // 创建订单
            Order order = new Order();
            order.setId(orderId);
            order.setUserId(userId);
            order.setGoodsId(goodsId);
            order.setGoodsName(goodsName);
            order.setGoodsImage(goodsImage);
            order.setSeckillPrice(seckillPrice);
            order.setQuantity(quantity);
            order.setTotalAmount(seckillPrice.multiply(BigDecimal.valueOf(quantity)));
            order.setStatus(0); // 待支付

            // 插入订单
            orderMapper.insert(order);

            // 发送延时消息，实现订单超时取消
            sendDelayMessage(orderId);

            log.info("订单创建成功: orderId={}, userId={}, goodsId={}", orderId, userId, goodsId);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.ERROR, "系统繁忙，请稍后重试");
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * 检查订单是否已存在
     */
    private boolean checkOrderExists(String orderId) {
        return orderMapper.selectById(orderId) != null;
    }

    /**
     * 发送延时消息，实现订单超时自动取消
     */
    private void sendDelayMessage(String orderId) {
        // 使用 RocketMQ 延时消息，延时时间为订单超时时间
        // DELAY_LEVEL_4 = 30秒，可配置
        // 实际项目中应该使用自定义延时级别
        try {
            rocketMQTemplate.syncSend(MqConstants.SECKILL_ORDER_TOPIC + ":" + MqConstants.TAG_CANCEL_ORDER,
                    orderId, 3000, 4); // level 4 = 30秒延时
        } catch (Exception e) {
            log.warn("发送延时消息失败: orderId={}", orderId, e);
        }
    }

    /**
     * 取消订单
     */
    @Transactional(rollbackFor = Exception.class)
    public void cancelOrder(String orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            log.warn("订单不存在: orderId={}", orderId);
            return;
        }

        // 只有待支付状态的订单才能取消
        if (order.getStatus() != 0) {
            log.warn("订单状态不是待支付，无法取消: orderId={}, status={}", orderId, order.getStatus());
            return;
        }

        // 更新订单状态为已取消
        order.setStatus(2);
        orderMapper.updateById(order);

        // 恢复库存
        restoreStock(order.getGoodsId());

        log.info("订单已取消: orderId={}", orderId);
    }

    /**
     * 恢复库存
     */
    private void restoreStock(Long goodsId) {
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        redisTemplate.opsForValue().increment(stockKey);
        log.info("库存已恢复: goodsId={}", goodsId);
    }

    /**
     * 支付订单
     */
    @Transactional(rollbackFor = Exception.class)
    public void payOrder(String orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_EXIST);
        }

        if (order.getStatus() != 0) {
            if (order.getStatus() == 1) {
                throw new BusinessException(ResultCode.ORDER_PAID);
            }
            if (order.getStatus() == 2) {
                throw new BusinessException(ResultCode.ORDER_CANCELLED);
            }
            throw new BusinessException(ResultCode.ORDER_TIMEOUT);
        }

        // 更新订单状态为已支付
        order.setStatus(1);
        order.setPayTime(java.time.LocalDateTime.now());
        orderMapper.updateById(order);

        log.info("订单支付成功: orderId={}", orderId);
    }

    /**
     * 根据订单号查询订单
     */
    public Order getOrderById(String orderId) {
        return orderMapper.selectById(orderId);
    }
}
