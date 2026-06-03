package com.seckill.goods.controller;

import com.seckill.common.result.Result;
import com.seckill.goods.entity.SeckillGoods;
import com.seckill.goods.service.SeckillService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 秒杀商品控制器
 */
@RestController
@RequestMapping("/goods")
@RequiredArgsConstructor
public class GoodsController {

    private final SeckillService seckillService;

    /**
     * 获取秒杀商品列表（全量，用于商家端等不需要分页的场景）
     */
    @GetMapping("/list")
    public Result<List<SeckillGoods>> getSeckillGoodsList() {
        List<SeckillGoods> list = seckillService.getGoodsList();
        return Result.success(list);
    }

    /**
     * 分页获取秒杀商品列表（用户端，支持搜索/筛选/排序）
     * @param keyword   商品名称关键字（模糊搜索，可为空）
     * @param category  商品分类（精确匹配，可为空）
     * @param status    活动状态（0-已下线 1-准备中 2-进行中 3-已结束，可为空表示全部）
     * @param page      页码（从1开始，默认1）
     * @param size      每页数量（默认12）
     * @param sortBy    排序字段：default|price_asc|price_desc|stock_asc|sold_desc
     */
    @GetMapping("/list/paged")
    public Result<Map<String, Object>> getSeckillGoodsListPaged(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "12") Integer size,
            @RequestParam(defaultValue = "default") String sortBy) {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 12;
        Map<String, Object> result = seckillService.getGoodsListPaged(keyword, category, status, page, size, sortBy);
        return Result.success(result);
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

    /**
     * 订单创建后同步扣减数据库库存（内部接口，由订单服务调用）
     */
    @PostMapping("/updateStockAndSold/{goodsId}")
    public Result<String> updateStockAndSold(@PathVariable("goodsId") Long goodsId) {
        seckillService.updateGoodsStockAndSold(goodsId);
        return Result.success("数据库库存同步成功");
    }
}
