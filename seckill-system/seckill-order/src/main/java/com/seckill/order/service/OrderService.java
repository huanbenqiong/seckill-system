package com.seckill.order.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seckill.common.constant.RedisConstants;
import com.seckill.common.exception.BusinessException;
import com.seckill.common.result.ResultCode;
import com.seckill.order.entity.Order;
import com.seckill.order.feign.GoodsFeignClient;
import com.seckill.order.mapper.OrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
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
    private final GoodsFeignClient goodsFeignClient;

    /**
     * 创建秒杀订单
     */
    @Transactional(rollbackFor = Exception.class)
    public void createSeckillOrder(Long userId, Long seckillId, Long orderId, BigDecimal amount) {
        // 获取分布式锁，防止重复下单
        String lockKey = RedisConstants.LOCK_SECKILL + seckillId + ":" + userId;
        RLock lock = redissonClient.getLock(lockKey);

        try {
            if (!lock.tryLock(3, 30, TimeUnit.SECONDS)) {
                throw new BusinessException(ResultCode.SECKILL_ILLEGAL_REQUEST);
            }

            // 检查是否已存在订单
            if (orderMapper.selectById(orderId) != null) {
                log.warn("订单已存在: orderId={}", orderId);
                return;
            }

            // 创建订单
            Order order = new Order();
            order.setId(orderId);
            order.setUserId(userId);
            order.setSeckillId(seckillId);
            order.setSeckillPrice(amount);
            order.setAmount(amount);
            order.setStatus(0); // 待支付

            orderMapper.insert(order);

            log.info("订单创建成功: orderId={}, userId={}, seckillId={}", orderId, userId, seckillId);

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
     * 获取用户的所有订单
     */
    public List<Order> getUserOrders(Long userId) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getUserId, userId);
        wrapper.orderByDesc(Order::getCreateTime);
        return orderMapper.selectList(wrapper);
    }

    /**
     * 取消订单（内部使用，无需用户ID）
     */
    @Transactional(rollbackFor = Exception.class)
    public void cancelOrder(Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            log.warn("订单不存在: orderId={}", orderId);
            return;
        }

        if (order.getStatus() != 0) {
            log.warn("订单状态不是待支付，无法取消: orderId={}, status={}", orderId, order.getStatus());
            return;
        }

        order.setStatus(2);
        orderMapper.updateById(order);

        // 恢复库存
        restoreStock(order.getSeckillId());

        log.info("订单已取消: orderId={}", orderId);
    }

    /**
     * 取消订单（用户操作，需要验证用户ID）
     */
    @Transactional(rollbackFor = Exception.class)
    public void cancelOrder(Long orderId, Long userId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_EXIST);
        }

        // 验证订单属于当前用户
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权操作此订单");
        }

        if (order.getStatus() != 0) {
            log.warn("订单状态不是待支付，无法取消: orderId={}, status={}", orderId, order.getStatus());
            throw new BusinessException("订单状态异常，无法取消");
        }

        order.setStatus(2);
        orderMapper.updateById(order);

        // 恢复库存
        restoreStock(order.getSeckillId());

        log.info("订单已取消: orderId={}", orderId);
    }

    /**
     * 恢复库存
     */
    private void restoreStock(Long seckillId) {
        String stockKey = RedisConstants.SECKILL_STOCK + seckillId;
        String soldKey = RedisConstants.SECKILL_SOLD + seckillId;
        redisTemplate.opsForValue().increment(stockKey);
        redisTemplate.opsForValue().decrement(soldKey);
        // 同步恢复数据库库存
        try {
            goodsFeignClient.restoreStock(seckillId);
        } catch (Exception e) {
            log.error("同步恢复数据库库存失败: seckillId={}", seckillId, e);
        }
        log.info("库存已恢复: seckillId={}", seckillId);
    }

    /**
     * 支付订单
     */
    @Transactional(rollbackFor = Exception.class)
    public void payOrder(Long orderId, Long userId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_EXIST);
        }

        // 验证订单属于当前用户
        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权操作此订单");
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

        order.setStatus(1);
        order.setPayTime(java.time.LocalDateTime.now());
        orderMapper.updateById(order);

        log.info("订单支付成功: orderId={}", orderId);
    }

    /**
     * 根据订单号查询订单
     */
    public Order getOrderById(Long orderId) {
        return orderMapper.selectById(orderId);
    }

    /**
     * 根据订单号和用户ID查询订单
     */
    public Order getOrderByIdAndUserId(Long orderId, Long userId) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getId, orderId);
        wrapper.eq(Order::getUserId, userId);
        return orderMapper.selectOne(wrapper);
    }
}
