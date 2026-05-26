package com.seckill.goods.controller;

import com.seckill.common.result.Result;
import com.seckill.goods.entity.SeckillGoods;
import com.seckill.goods.service.SeckillService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 秒杀商品控制器
 */
@RestController
@RequestMapping("/goods")
@RequiredArgsConstructor
public class GoodsController {

    private final SeckillService seckillService;

    /**
     * 获取秒杀商品列表
     */
    @GetMapping("/list")
    public Result<List<SeckillGoods>> getSeckillGoodsList() {
        List<SeckillGoods> list = seckillService.getGoodsList();
        return Result.success(list);
    }

    /**
     * 获取秒杀商品详情
     */
    @GetMapping("/detail/{goodsId}")
    public Result<SeckillGoods> getGoodsDetail(@PathVariable("goodsId") Long goodsId) {
        SeckillGoods goods = seckillService.getGoodsDetail(goodsId);
        return Result.success(goods);
    }

    /**
     * 执行秒杀
     */
    @PostMapping("/seckill/{goodsId}")
    public Result<String> doSeckill(
            @PathVariable("goodsId") Long goodsId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {

        if (userId == null) {
            return Result.error("请先登录");
        }

        String orderId = seckillService.doSeckill(userId, goodsId);
        return Result.success("秒杀成功", orderId);
    }

    /**
     * 预热秒杀商品库存到 Redis (管理员接口)
     */
    @PostMapping("/preload/{goodsId}")
    public Result<String> preloadStock(@PathVariable("goodsId") Long goodsId) {
        seckillService.preloadStockToRedis(goodsId);
        return Result.success("库存预热成功");
    }

    /**
     * 恢复秒杀商品库存（内部接口，供其他服务调用）
     */
    @PostMapping("/restoreStock/{goodsId}")
    public Result<String> restoreStock(@PathVariable("goodsId") Long goodsId) {
        seckillService.restoreStockInDb(goodsId);
        return Result.success("库存恢复成功");
    }
}
