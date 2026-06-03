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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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

    private static final String UPLOAD_DIR = System.getProperty("user.dir") + File.separator + "uploads" + File.separator;

    /**
     * 上传商品图片
     */
    @PostMapping("/upload")
    public Result<String> uploadImage(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam("file") MultipartFile file) {
        if (userId == null) return Result.error("请先登录");
        if (file == null || file.isEmpty()) return Result.error("文件不能为空");

        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase()
                : "";
        if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)")) {
            return Result.error("不支持的文件类型，请上传 JPG/PNG/GIF/WebP 图片");
        }

        try {
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) dir.mkdirs();

            String filename = UUID.randomUUID().toString().replace("-", "") + ext;
            File dest = new File(UPLOAD_DIR + filename);
            file.transferTo(dest);

            String url = "/api/seller/images/" + filename;
            return Result.success("上传成功", url);
        } catch (IOException e) {
            return Result.error("上传失败: " + e.getMessage());
        }
    }

    /**
     * 获取已上传的商品图片
     */
    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<byte[]> getImage(@PathVariable String filename) {
        // Prevent path traversal
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Path imagePath = Paths.get(UPLOAD_DIR + filename);
            if (!Files.exists(imagePath)) return ResponseEntity.notFound().build();

            byte[] data = Files.readAllBytes(imagePath);
            String contentType = Files.probeContentType(imagePath);
            MediaType mediaType = contentType != null
                    ? MediaType.parseMediaType(contentType)
                    : MediaType.APPLICATION_OCTET_STREAM;

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header("Cache-Control", "public, max-age=86400")
                    .body(data);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

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
            
            // 商品名称
            Object nameObj = productData.get("name");
            if (nameObj != null && !nameObj.toString().isEmpty()) {
                goods.setName(nameObj.toString());
            }

            // 商品分类
            Object categoryObj = productData.get("category");
            if (categoryObj != null && !categoryObj.toString().isEmpty()) {
                goods.setCategory(categoryObj.toString());
            }

            // 商品图片
            Object imageUrlObj = productData.get("imageUrl");
            if (imageUrlObj != null && !imageUrlObj.toString().isEmpty()) {
                goods.setImageUrl(imageUrlObj.toString());
            }

            goods.setCreateTime(LocalDateTime.now());
            goods.setUpdateTime(LocalDateTime.now());

            sellerGoodsMapper.insert(goods);

            Map<String, Object> result = new HashMap<>();
            result.put("id", goods.getId());
            result.put("seckillId", goods.getId());
            result.put("goodsId", goods.getGoodsId());

            return Result.success("商品发布成功", result);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("发布失败: " + e.getMessage());
        }
    }

    /**
     * 更新秒杀商品（支持库存增减调整）
     */
    @PutMapping("/products/{id}")
    public Result<String> updateProduct(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> productData) {
        if (userId == null) {
            return Result.error("请先登录");
        }

        SellerGoods goods = sellerGoodsMapper.selectById(id);
        if (goods == null) {
            return Result.error("商品不存在");
        }

        // 更新秒杀价格
        if (productData.containsKey("seckillPrice")) {
            goods.setSeckillPrice(new BigDecimal(productData.get("seckillPrice").toString()));
        }

        // 更新活动时间
        String startStr = (String) productData.get("startDate");
        if (startStr != null && !startStr.isEmpty()) {
            String dateStr = startStr.replace("Z", "");
            if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$")) {
                goods.setStartDate(LocalDateTime.parse(dateStr + ":00", DATETIME_T_FORMATTER));
            } else if (dateStr.contains("T")) {
                goods.setStartDate(LocalDateTime.parse(dateStr, DATETIME_T_FORMATTER));
            } else {
                goods.setStartDate(LocalDateTime.parse(dateStr, DATETIME_FORMATTER));
            }
        }

        String endStr = (String) productData.get("endDate");
        if (endStr != null && !endStr.isEmpty()) {
            String dateStr = endStr.replace("Z", "");
            if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$")) {
                goods.setEndDate(LocalDateTime.parse(dateStr + ":00", DATETIME_T_FORMATTER));
            } else if (dateStr.contains("T")) {
                goods.setEndDate(LocalDateTime.parse(dateStr, DATETIME_T_FORMATTER));
            } else {
                goods.setEndDate(LocalDateTime.parse(dateStr, DATETIME_FORMATTER));
            }
        }

        // 更新商品名称
        if (productData.containsKey("name")) {
            Object nameObj = productData.get("name");
            goods.setName(nameObj != null && !nameObj.toString().isEmpty() ? nameObj.toString() : goods.getName());
        }

        // 更新商品分类
        if (productData.containsKey("category")) {
            Object categoryObj = productData.get("category");
            goods.setCategory(categoryObj != null && !categoryObj.toString().isEmpty() ? categoryObj.toString() : goods.getCategory());
        }

        // 更新图片URL
        if (productData.containsKey("imageUrl")) {
            Object imageUrlObj = productData.get("imageUrl");
            goods.setImageUrl(imageUrlObj != null ? imageUrlObj.toString() : null);
        }

        // 库存调整
        if (productData.containsKey("stockChange")) {
            int stockChange = Integer.parseInt(productData.get("stockChange").toString());
            if (stockChange != 0) {
                // 更新数据库库存
                goods.setStockCount(goods.getStockCount() + stockChange);
                if (goods.getStockCount() < 0) {
                    goods.setStockCount(0);
                }

                // 更新 Redis 库存
                String stockKey = RedisConstants.SECKILL_STOCK + id;
                redisTemplate.opsForValue().increment(stockKey, stockChange);
            }
        }

        goods.setUpdateTime(LocalDateTime.now());
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
