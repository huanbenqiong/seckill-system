package com.seckill.order.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seckill.common.constant.RedisConstants;
import com.seckill.common.exception.BusinessException;
import com.seckill.common.result.ResultCode;
import com.seckill.order.entity.Order;
import com.seckill.order.feign.GoodsFeignClient;
import com.seckill.order.mapper.OrderMapper;
import lombok.RequiredArgsConstructor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OrderService.class);

    private final OrderMapper orderMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedissonClient redissonClient;
    private final GoodsFeignClient goodsFeignClient;

    @Transactional(rollbackFor = Exception.class)
    public void createSeckillOrder(Long userId, Long seckillId, Long orderId, BigDecimal amount) {
        String lockKey = RedisConstants.LOCK_SECKILL + seckillId + ":" + userId;
        RLock lock = redissonClient.getLock(lockKey);

        try {
            if (!lock.tryLock(3, 30, TimeUnit.SECONDS)) {
                throw new BusinessException(ResultCode.SECKILL_ILLEGAL_REQUEST);
            }

            if (orderMapper.selectById(orderId) != null) {
                log.warn("订单已存在: orderId={}", orderId);
                return;
            }

            Order order = new Order();
            order.setId(orderId);
            order.setUserId(userId);
            order.setSeckillId(seckillId);
            order.setSeckillPrice(amount);
            order.setAmount(amount);
            order.setStatus(0);

            orderMapper.insert(order);
            log.info("订单创建成功: orderId={}, userId={}, seckillId={}", orderId, userId, seckillId);

            // 同步扣减数据库库存和已售（在锁保护内执行，失败不影响订单已入库）
            try {
                goodsFeignClient.updateStockAndSold(seckillId);
            } catch (Exception e) {
                log.error("同步数据库库存失败，订单已创建: orderId={}, seckillId={}", orderId, seckillId, e);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.ERROR, "系统繁忙，请稍后重试");
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    public List<Order> getUserOrders(Long userId) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getUserId, userId);
        wrapper.orderByDesc(Order::getCreateTime);
        return orderMapper.selectList(wrapper);
    }

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
        restoreStock(order.getSeckillId());
        log.info("订单已取消: orderId={}", orderId);
    }

    @Transactional(rollbackFor = Exception.class)
    public void cancelOrder(Long orderId, Long userId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_EXIST);
        }

        if (!order.getUserId().equals(userId)) {
            throw new BusinessException("无权操作此订单");
        }

        if (order.getStatus() != 0) {
            log.warn("订单状态不是待支付，无法取消: orderId={}, status={}", orderId, order.getStatus());
            throw new BusinessException("订单状态异常，无法取消");
        }

        order.setStatus(2);
        orderMapper.updateById(order);
        restoreStock(order.getSeckillId());
        log.info("订单已取消: orderId={}", orderId);
    }

    private void restoreStock(Long seckillId) {
        String stockKey = RedisConstants.SECKILL_STOCK + seckillId;
        String soldKey = RedisConstants.SECKILL_SOLD + seckillId;
        redisTemplate.opsForValue().increment(stockKey);
        redisTemplate.opsForValue().decrement(soldKey);
        try {
            goodsFeignClient.restoreStock(seckillId);
        } catch (Exception e) {
            log.error("同步恢复数据库库存失败: seckillId={}", seckillId, e);
        }
        log.info("库存已恢复: seckillId={}", seckillId);
    }

    @Transactional(rollbackFor = Exception.class)
    public void payOrder(Long orderId, Long userId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_EXIST);
        }

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

    public Order getOrderById(Long orderId) {
        return orderMapper.selectById(orderId);
    }

    public Order getOrderByIdAndUserId(Long orderId, Long userId) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getId, orderId);
        wrapper.eq(Order::getUserId, userId);
        return orderMapper.selectOne(wrapper);
    }
}
