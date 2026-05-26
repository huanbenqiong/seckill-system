package com.seckill.order.controller;

import com.seckill.common.result.Result;
import com.seckill.order.entity.Order;
import com.seckill.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * 订单控制器
 */
@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * 创建秒杀订单 (Feign 接口)
     */
    @PostMapping("/create")
    public Result<String> createSeckillOrder(
            @RequestParam("userId") Long userId,
            @RequestParam("seckillId") Long seckillId,
            @RequestParam("orderId") Long orderId,
            @RequestParam("amount") Integer amount) {

        orderService.createSeckillOrder(userId, seckillId, orderId, BigDecimal.valueOf(amount));
        return Result.success("订单创建成功", String.valueOf(orderId));
    }

    /**
     * 获取用户的所有订单
     */
    @GetMapping("/list")
    public Result<List<Order>> getUserOrders(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        List<Order> orders = orderService.getUserOrders(userId);
        return Result.success(orders);
    }

    /**
     * 支付订单
     */
    @PostMapping("/pay/{orderId}")
    public Result<String> payOrder(
            @PathVariable("orderId") Long orderId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        orderService.payOrder(orderId, userId);
        return Result.success("支付成功");
    }

    /**
     * 获取订单详情
     */
    @GetMapping("/detail/{orderId}")
    public Result<Order> getOrderDetail(
            @PathVariable("orderId") Long orderId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        Order order = orderService.getOrderByIdAndUserId(orderId, userId);
        if (order == null) {
            return Result.error("订单不存在或无权访问");
        }
        return Result.success(order);
    }

    /**
     * 取消订单
     */
    @PostMapping("/cancel/{orderId}")
    public Result<String> cancelOrder(
            @PathVariable("orderId") Long orderId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        orderService.cancelOrder(orderId, userId);
        return Result.success("订单已取消");
    }
}
