package com.seckill.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seckill.common.constant.RedisConstants;
import com.seckill.common.result.Result;
import com.seckill.user.entity.SellerGoods;
import com.seckill.user.entity.SellerOrder;
import com.seckill.user.mapper.SellerGoodsMapper;
import com.seckill.user.mapper.SellerOrderMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 商家控制器
 */
@RestController
@RequestMapping("/seller")
@RequiredArgsConstructor
public class SellerController {

    private final SellerGoodsMapper sellerGoodsMapper;
    private final SellerOrderMapper sellerOrderMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATETIME_T_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DATETIME_T_SHORT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    /**
     * 获取店铺统计信息（带实时库存）
     */
    @GetMapping("/dashboard")
    public Result<Map<String, Object>> getDashboard(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }

        List<SellerGoods> products = sellerGoodsMapper.selectList(null);
        // 计算实时总库存
        int totalStock = 0;
        for (SellerGoods p : products) {
            String stockKey = RedisConstants.SECKILL_STOCK + p.getId();
            Object stock = redisTemplate.opsForValue().get(stockKey);
            if (stock != null) {
                totalStock += Integer.parseInt(stock.toString());
            } else {
                totalStock += (p.getStockCount() != null ? p.getStockCount() : 0);
            }
        }

        List<SellerOrder> orders = sellerOrderMapper.selectList(null);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProducts", products.size());
        stats.put("totalStock", totalStock);
        stats.put("totalSold", orders.stream().filter(o -> o.getStatus() != 2).count());
        stats.put("totalOrders", orders.size());
        stats.put("pendingOrders", orders.stream().filter(o -> o.getStatus() == 0).count());
        stats.put("paidOrders", orders.stream().filter(o -> o.getStatus() == 1).count());

        BigDecimal totalSales = orders.stream()
                .filter(o -> o.getStatus() == 1 && o.getAmount() != null)
                .map(SellerOrder::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.put("totalSales", totalSales);

        return Result.success(stats);
    }

    /**
     * 获取商品列表（带实时库存）
     */
    @GetMapping("/products")
    public Result<List<SellerGoods>> getProducts(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        List<SellerGoods> products = sellerGoodsMapper.selectList(null);
        // 补充实时库存和已售
        for (SellerGoods p : products) {
            String stockKey = RedisConstants.SECKILL_STOCK + p.getId();
            String soldKey = RedisConstants.SECKILL_SOLD + p.getId();
            Object stock = redisTemplate.opsForValue().get(stockKey);
            if (stock != null) {
                p.setStockCount(Integer.parseInt(stock.toString()));
            }
            Object sold = redisTemplate.opsForValue().get(soldKey);
            if (sold != null) {
                p.setSoldCount(Integer.parseInt(sold.toString()));
            }
        }
        return Result.success(products);
    }

    /**
     * 获取商品实时库存（供前端轮询或WebSocket更新）
     */
    @GetMapping("/products/stock")
    public Result<Map<String, Integer>> getProductsStock(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        List<SellerGoods> products = sellerGoodsMapper.selectList(null);
        Map<String, Integer> stockMap = new HashMap<>();
        for (SellerGoods p : products) {
            stockMap.put(String.valueOf(p.getId()), p.getStockCount());
        }
        return Result.success(stockMap);
    }

    /**
     * 发布秒杀商品
     */
    @PostMapping("/products")
    public Result<Map<String, Object>> addProduct(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody Map<String, Object> productData) {
        if (userId == null) {
            return Result.error("请先登录");
        }

        try {
            // 构建秒杀商品（手动设置ID）
            SellerGoods goods = new SellerGoods();
            goods.setId(System.currentTimeMillis());
            goods.setGoodsId(System.currentTimeMillis());
            
            // 解析秒杀价格
            Object priceObj = productData.get("seckillPrice");
            if (priceObj != null) {
                goods.setSeckillPrice(new BigDecimal(priceObj.toString()));
            }
            
            // 解析库存
            Object stockObj = productData.get("stockCount");
            if (stockObj != null) {
                goods.setStockCount(Integer.parseInt(stockObj.toString()));
            }
            
            goods.setSoldCount(0);
            goods.setLimitCount(1);
            goods.setTimeoutSeconds(900);
            goods.setVersion(0);
            goods.setStatus(2); // 进行中
            
            // 解析时间
            String startStr = (String) productData.get("startDate");
            if (startStr != null && !startStr.isEmpty()) {
                String dateStr = startStr.replace("Z", "");
                if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$")) {
                    // 格式: 2026-05-03T17:58 (datetime-local输入)
                    goods.setStartDate(LocalDateTime.parse(dateStr + ":00", DATETIME_T_FORMATTER));
                } else if (dateStr.contains("T")) {
                    goods.setStartDate(LocalDateTime.parse(dateStr, DATETIME_T_FORMATTER));
                } else {
                    goods.setStartDate(LocalDateTime.parse(dateStr, DATETIME_FORMATTER));
                }
            } else {
                goods.setStartDate(LocalDateTime.now());
            }
            
            String endStr = (String) productData.get("endDate");
            if (endStr != null && !endStr.isEmpty()) {
                String dateStr = endStr.replace("Z", "");
                if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$")) {
                    // 格式: 2026-05-03T17:58 (datetime-local输入)
                    goods.setEndDate(LocalDateTime.parse(dateStr + ":00", DATETIME_T_FORMATTER));
                } else if (dateStr.contains("T")) {
                    goods.setEndDate(LocalDateTime.parse(dateStr, DATETIME_T_FORMATTER));
                } else {
                    goods.setEndDate(LocalDateTime.parse(dateStr, DATETIME_FORMATTER));
                }
            } else {
                goods.setEndDate(LocalDateTime.now().plusDays(7));
            }
            
            goods.setCreateTime(LocalDateTime.now());
            goods.setUpdateTime(LocalDateTime.now());
            
            sellerGoodsMapper.insert(goods);
            
            Map<String, Object> result = new HashMap<>();
            result.put("id", goods.getId());
            result.put("goodsId", goods.getGoodsId());
            
            return Result.success("商品发布成功", result);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("发布失败: " + e.getMessage());
        }
    }

    /**
     * 更新秒杀商品
     */
    @PutMapping("/products/{id}")
    public Result<String> updateProduct(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable("id") Long id,
            @RequestBody SellerGoods goods) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        goods.setId(id);
        sellerGoodsMapper.updateById(goods);
        return Result.success("商品更新成功");
    }

    /**
     * 删除秒杀商品
     */
    @DeleteMapping("/products/{id}")
    public Result<String> deleteProduct(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable("id") Long id) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        sellerGoodsMapper.deleteById(id);
        return Result.success("商品删除成功");
    }

    /**
     * 获取订单列表
     */
    @GetMapping("/orders")
    public Result<List<SellerOrder>> getOrders(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }
        List<SellerOrder> orders = sellerOrderMapper.selectList(null);
        return Result.success(orders);
    }

    /**
     * 获取销售统计（带实时库存）
     */
    @GetMapping("/statistics")
    public Result<Map<String, Object>> getStatistics(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            return Result.error("请先登录");
        }

        List<SellerGoods> products = sellerGoodsMapper.selectList(null);
        int totalStock = 0;
        for (SellerGoods p : products) {
            String stockKey = RedisConstants.SECKILL_STOCK + p.getId();
            Object stock = redisTemplate.opsForValue().get(stockKey);
            if (stock != null) {
                totalStock += Integer.parseInt(stock.toString());
            } else {
                totalStock += (p.getStockCount() != null ? p.getStockCount() : 0);
            }
        }

        List<SellerOrder> orders = sellerOrderMapper.selectList(null);
        
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalProducts", products.size());
        stats.put("totalStock", totalStock);
        stats.put("totalSold", orders.stream().filter(o -> o.getStatus() != 2).count());
        stats.put("totalOrders", orders.size());
        stats.put("paidOrders", orders.stream().filter(o -> o.getStatus() == 1).count());
        stats.put("pendingOrders", orders.stream().filter(o -> o.getStatus() == 0).count());
        
        BigDecimal totalSales = orders.stream()
                .filter(o -> o.getStatus() == 1 && o.getAmount() != null)
                .map(SellerOrder::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.put("totalSales", totalSales);
        
        return Result.success(stats);
    }
}
