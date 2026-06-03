package com.seckill.order.feign;

import com.seckill.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

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

    /**
     * 恢复商品库存（订单取消时调用）
     */
    @PostMapping("/restoreStock/{goodsId}")
    Result<Object> restoreStock(@RequestParam("goodsId") Long goodsId);

    /**
     * 订单创建后同步扣减数据库库存
     */
    @PostMapping("/updateStockAndSold/{goodsId}")
    Result<Object> updateStockAndSold(@PathVariable("goodsId") Long goodsId);
}
