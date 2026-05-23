package com.seckill.goods.feign;

import com.seckill.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * 订单服务 Feign 客户端
 */
@FeignClient(name = "seckill-order", path = "/order")
public interface OrderFeignClient {

    /**
     * 创建秒杀订单
     */
    @PostMapping("/create")
    Result<String> createSeckillOrder(
            @RequestParam("userId") Long userId,
            @RequestParam("goodsId") Long goodsId,
            @RequestParam("orderId") String orderId
    );
}
