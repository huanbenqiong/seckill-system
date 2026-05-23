package com.seckill.order.controller;

import com.seckill.common.result.Result;
import com.seckill.order.entity.Order;
import com.seckill.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

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
            @RequestParam("goodsId") Long goodsId,
            @RequestParam("orderId") String orderId,
            @RequestParam(value = "goodsName", defaultValue = "秒杀商品") String goodsName,
            @RequestParam(value = "goodsImage", defaultValue = "") String goodsImage,
            @RequestParam(value = "seckillPrice", defaultValue = "0") BigDecimal seckillPrice,
            @RequestParam(value = "quantity", defaultValue = "1") Integer quantity) {

        orderService.createSeckillOrder(userId, goodsId, orderId, goodsName, goodsImage, seckillPrice, quantity);
        return Result.success("订单创建成功", orderId);
    }

    /**
     * 支付订单
     */
    @PostMapping("/pay/{orderId}")
    public Result<Void> payOrder(@PathVariable("orderId") String orderId) {
        orderService.payOrder(orderId);
        return Result.success("支付成功");
    }

    /**
     * 获取订单详情
     */
    @GetMapping("/detail/{orderId}")
    public Result<Order> getOrderDetail(@PathVariable("orderId") String orderId) {
        Order order = orderService.getOrderById(orderId);
        if (order == null) {
            return Result.error("订单不存在");
        }
        return Result.success(order);
    }

    /**
     * 取消订单
     */
    @PostMapping("/cancel/{orderId}")
    public Result<Void> cancelOrder(@PathVariable("orderId") String orderId) {
        orderService.cancelOrder(orderId);
        return Result.success("订单已取消");
    }
}
