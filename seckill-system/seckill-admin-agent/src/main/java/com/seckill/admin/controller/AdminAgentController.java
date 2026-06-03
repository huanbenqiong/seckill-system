package com.seckill.admin.controller;

import com.seckill.admin.service.DataAgentService;
import com.seckill.admin.service.StockAgentService;
import com.seckill.common.result.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminAgentController {

    private final StockAgentService stockAgentService;
    private final DataAgentService dataAgentService;

    @Value("${agent.token}")
    private String agentToken;

    /**
     * 统一 Token 校验
     */
    private Result<?> verifyToken(String token) {
        if (token == null || !token.equals(agentToken)) {
            return Result.error(401, "Agent Token 无效");
        }
        return null;
    }

    // ==================== 库存相关接口 ====================

    /**
     * 查询指定商品当前库存
     */
    @GetMapping("/goods/{id}/stock")
    public Result<?> getStock(
            @RequestHeader(value = "X-Agent-Token", required = false) String token,
            @PathVariable("id") Long id) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        Integer stock = stockAgentService.getStock(id);
        if (stock == null) {
            return Result.error("商品不存在");
        }
        return Result.success(Map.of("goodsId", id, "stockCount", stock));
    }

    /**
     * 查询低库存商品列表
     * GET /admin/api/goods/low-stock?threshold=10
     */
    @GetMapping("/goods/low-stock")
    public Result<?> getLowStockGoods(
            @RequestHeader(value = "X-Agent-Token", required = false) String token,
            @RequestParam(defaultValue = "10") int threshold) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        List<?> goods = stockAgentService.getLowStockGoods(threshold);
        return Result.success(goods);
    }

    /**
     * 追加指定商品库存
     * POST /admin/api/goods/{id}/stock/add
     */
    @PostMapping("/goods/{id}/stock/add")
    public Result<?> addStock(
            @RequestHeader(value = "X-Agent-Token", required = false) String token,
            @PathVariable("id") Long id,
            @RequestBody Map<String, Integer> body) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        int addCount = body.getOrDefault("addCount", 0);
        if (addCount <= 0) {
            return Result.error("增加数量必须大于0");
        }
        int newStock = stockAgentService.addStock(id, addCount);
        return Result.success(Map.of(
                "goodsId", id,
                "addedCount", addCount,
                "currentStock", newStock
        ));
    }

    /**
     * 批量补货（将低库存商品补至目标库存）
     * POST /admin/api/goods/restock
     * Body: { "threshold": 10, "targetStock": 50 }
     */
    @PostMapping("/goods/restock")
    public Result<?> batchRestock(
            @RequestHeader(value = "X-Agent-Token", required = false) String token,
            @RequestBody Map<String, Integer> body) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        int threshold = body.getOrDefault("threshold", 10);
        int targetStock = body.getOrDefault("targetStock", 50);
        List<String> results = stockAgentService.batchRestock(threshold, targetStock);
        return Result.success(Map.of("results", results, "total", results.size()));
    }

    // ==================== 大盘数据接口 ====================

    /**
     * 今日秒杀大盘汇总
     */
    @GetMapping("/data/dashboard")
    public Result<?> getDashboard(
            @RequestHeader(value = "X-Agent-Token", required = false) String token) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        DataAgentService.DashboardData data = dataAgentService.getDashboard();
        return Result.success(data);
    }

    /**
     * 单商品统计
     */
    @GetMapping("/data/goods/{id}/stats")
    public Result<?> getGoodsStats(
            @RequestHeader(value = "X-Agent-Token", required = false) String token,
            @PathVariable("id") Long id) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        DataAgentService.GoodsStats stats = dataAgentService.getGoodsStats(id);
        if (stats == null) {
            return Result.error("商品不存在");
        }
        return Result.success(stats);
    }

    /**
     * 销售排行榜
     */
    @GetMapping("/data/sales-rank")
    public Result<?> getSalesRank(
            @RequestHeader(value = "X-Agent-Token", required = false) String token,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "10") int limit) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        LocalDateTime start = startDate != null
                ? LocalDate.parse(startDate).atStartOfDay()
                : LocalDate.now().atStartOfDay();
        LocalDateTime end = endDate != null
                ? LocalDate.parse(endDate).atTime(LocalTime.MAX)
                : LocalDateTime.now();

        List<?> rank = dataAgentService.getSalesRank(start, end, limit);
        return Result.success(rank);
    }

    /**
     * 所有商品列表（带实时库存）
     */
    @GetMapping("/data/goods")
    public Result<?> getAllGoods(
            @RequestHeader(value = "X-Agent-Token", required = false) String token) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        return Result.success(dataAgentService.getAllGoods());
    }

    /**
     * 批量延期商品活动
     * POST /admin/api/goods/extend-time
     * Body: { "goodsIds": [1, 2, 3], "extendDays": 1 }
     */
    @PostMapping("/goods/extend-time")
    public Result<?> extendActivityTime(
            @RequestHeader(value = "X-Agent-Token", required = false) String token,
            @RequestBody Map<String, Object> body) {
        Result<?> verify = verifyToken(token);
        if (verify != null) return verify;

        @SuppressWarnings("unchecked")
        List<Integer> idsRaw = (List<Integer>) body.get("goodsIds");
        if (idsRaw == null || idsRaw.isEmpty()) {
            return Result.error("商品ID列表不能为空");
        }
        List<Long> goodsIds = idsRaw.stream().map(Integer::longValue).toList();
        int extendDays = (int) body.getOrDefault("extendDays", 1);

        List<String> results = dataAgentService.extendActivityTime(goodsIds, extendDays);
        return Result.success(Map.of("results", results));
    }
}
