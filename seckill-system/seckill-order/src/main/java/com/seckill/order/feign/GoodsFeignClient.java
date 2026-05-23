package com.seckill.order.feign;

import com.seckill.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;

/**
 * 商品服务 Feign 客户端
 */
@FeignClient(name = "seckill-goods", path = "/goods")
public interface GoodsFeignClient {

    /**
     * 获取商品信息
     */
    @PostMapping("/getGoods")
    Result<Object> getGoods(@RequestParam("goodsId") Long goodsId);
}
