package com.seckill.goods.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seckill.common.constant.MqConstants;
import com.seckill.common.constant.RedisConstants;
import com.seckill.common.exception.BusinessException;
import com.seckill.common.mq.CreateOrderMessage;
import com.seckill.common.result.ResultCode;
import com.seckill.common.utils.SnowflakeIdGenerator;
import com.seckill.goods.entity.SeckillGoods;
import com.seckill.goods.mapper.SeckillGoodsMapper;
import lombok.RequiredArgsConstructor;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 秒杀服务 - 核心业务逻辑
 */
@Service
@RequiredArgsConstructor
public class SeckillService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SeckillService.class);

    private final SeckillGoodsMapper seckillGoodsMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    /** RocketMQ 可选注入：未部署 MQ 时服务仍可启动，秒杀时才报错 */
    @Autowired(required = false)
    private RocketMQTemplate rocketMQTemplate;

    private static final SnowflakeIdGenerator SNOWFLAKE = new SnowflakeIdGenerator(1, 1);

    private static final DefaultRedisScript<Long> STOCK_DECREASE_SCRIPT;

    static {
        STOCK_DECREASE_SCRIPT = new DefaultRedisScript<>();
        STOCK_DECREASE_SCRIPT.setScriptText(
                "if redis.call('exists', KEYS[1]) == 1 then " +
                "    local stock = tonumber(redis.call('get', KEYS[1])) " +
                "    if stock > 0 then " +
                "        redis.call('decr', KEYS[1]) " +
                "        return stock - 1 " +
                "    else " +
                "        return -1 " +
                "    end " +
                "else " +
                "    return -2 " +
                "end"
        );
        STOCK_DECREASE_SCRIPT.setResultType(Long.class);
    }

    /**
     * 根据起止时间动态计算并更新状态
     * 规则：0=已下线(不变), 1=准备中(未到开始时间), 2=进行中, 3=已结束(超过结束时间)
     */
    private void enrichStatus(SeckillGoods goods) {
        if (goods.getStatus() != null && goods.getStatus() == 0) return; // 已下线，不重算
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime start = goods.getStartDate();
        java.time.LocalDateTime end = goods.getEndDate();
        if (start != null && end != null) {
            if (now.isBefore(start))       goods.setStatus(1); // 准备中
            else if (now.isAfter(end))     goods.setStatus(3); // 已结束
            else                           goods.setStatus(2); // 进行中
        }
    }

    /**
     * 获取秒杀商品列表（实时库存和已售）
     */
    public List<SeckillGoods> getGoodsList() {
        List<SeckillGoods> list = seckillGoodsMapper.selectList(null);
        enrichRedisStock(list);
        return list;
    }

    /**
     * 分页查询秒杀商品列表（支持搜索/筛选/排序，实时库存）
     */
    public Map<String, Object> getGoodsListPaged(
            String keyword,
            String category,
            Integer status,
            int page,
            int size,
            String sortBy) {

        LambdaQueryWrapper<SeckillGoods> wrapper = new LambdaQueryWrapper<>();

        // 名称关键字模糊搜索
        if (keyword != null && !keyword.trim().isEmpty()) {
            wrapper.like(SeckillGoods::getName, keyword.trim());
        }

        // 分类精确筛选
        if (category != null && !category.trim().isEmpty()) {
            wrapper.eq(SeckillGoods::getCategory, category.trim());
        }

        // 状态筛选（null 表示全部，不过滤）
        if (status != null) {
            wrapper.eq(SeckillGoods::getStatus, status);
        }

        // 排序
        switch (sortBy != null ? sortBy : "default") {
            case "price_asc":
                wrapper.orderByAsc(SeckillGoods::getSeckillPrice);
                break;
            case "price_desc":
                wrapper.orderByDesc(SeckillGoods::getSeckillPrice);
                break;
            case "stock_asc":
                wrapper.orderByAsc(SeckillGoods::getStockCount);
                break;
            case "sold_desc":
                wrapper.orderByDesc(SeckillGoods::getSoldCount);
                break;
            default:
                wrapper.orderByDesc(SeckillGoods::getCreateTime);
                break;
        }

        // 先查出所有符合条件的记录（避免分页时被 Redis 丰富打乱）
        List<SeckillGoods> allFiltered = seckillGoodsMapper.selectList(wrapper);

        // 补充 Redis 实时库存
        enrichRedisStock(allFiltered);

        // 内存中重新排序（因为 Redis 丰富后 sortKey 已无用，但可保持一致）
        if ("price_asc".equals(sortBy)) {
            allFiltered.sort(Comparator.comparing(SeckillGoods::getSeckillPrice));
        } else if ("price_desc".equals(sortBy)) {
            allFiltered.sort(Comparator.comparing(SeckillGoods::getSeckillPrice).reversed());
        } else if ("stock_asc".equals(sortBy)) {
            allFiltered.sort(Comparator.comparing((SeckillGoods g) -> g.getStockCount() != null ? g.getStockCount() : 0));
        } else if ("sold_desc".equals(sortBy)) {
            allFiltered.sort(Comparator.comparing((SeckillGoods g) -> g.getSoldCount() != null ? g.getSoldCount() : 0).reversed());
        } else {
            allFiltered.sort(Comparator.comparing(SeckillGoods::getCreateTime, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        }

        int total = allFiltered.size();
        int totalPages = (int) Math.ceil((double) total / size);
        int fromIndex = (page - 1) * size;
        int toIndex = Math.min(fromIndex + size, total);

        List<SeckillGoods> pageData = fromIndex < total
                ? allFiltered.subList(fromIndex, toIndex)
                : Collections.emptyList();

        Map<String, Object> result = new HashMap<>();
        result.put("records", pageData);
        result.put("total", total);
        result.put("pages", totalPages);
        result.put("current", page);
        result.put("size", size);
        return result;
    }

    /**
     * 批量从 Redis 补充实时库存和已售，并动态计算状态
     */
    private void enrichRedisStock(List<SeckillGoods> list) {
        for (SeckillGoods goods : list) {
            String stockKey = RedisConstants.SECKILL_STOCK + goods.getId();
            String soldKey = RedisConstants.SECKILL_SOLD + goods.getId();

            Object stock = redisTemplate.opsForValue().get(stockKey);
            if (stock != null) {
                goods.setStockCount(Integer.parseInt(stock.toString()));
            }

            Object sold = redisTemplate.opsForValue().get(soldKey);
            if (sold != null) {
                goods.setSoldCount(Integer.parseInt(sold.toString()));
            } else if (goods.getSoldCount() != null && goods.getSoldCount() > 0) {
                redisTemplate.opsForValue().set(soldKey, goods.getSoldCount());
            }

            enrichStatus(goods);
        }
    }

    /**
     * 获取秒杀商品详情
     */
    public SeckillGoods getGoodsDetail(Long goodsId) {
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods == null) {
            throw new BusinessException("商品不存在");
        }
        enrichRedisStock(Collections.singletonList(goods));
        return goods;
    }

    /**
     * 执行秒杀
     */
    public String doSeckill(Long userId, Long goodsId) {
        log.info("开始秒杀: userId={}, goodsId={}", userId, goodsId);

        // 1. 检查商品是否存在
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods == null) {
            throw new BusinessException("商品不存在");
        }

        // 2. 预热库存和已售到 Redis
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        String soldKey = RedisConstants.SECKILL_SOLD + goodsId;
        ensureRedisInitialized(goodsId, goods, stockKey, soldKey);

        // 3. 检查活动状态（动态计算，基于起止时间）
        enrichStatus(goods);
        if (goods.getStatus() == null || goods.getStatus() == 0) {
            throw new BusinessException("商品已下线");
        }
        if (goods.getStatus() == 1) {
            throw new BusinessException("活动尚未开始，请耐心等待");
        }
        if (goods.getStatus() == 3) {
            throw new BusinessException(ResultCode.SECKILL_ENDED);
        }

        // 4. Redis Lua 原子扣减库存
        Long result = redisTemplate.execute(STOCK_DECREASE_SCRIPT, Collections.singletonList(stockKey));
        long remainingStock = result != null ? result : -2;

        if (remainingStock < 0) {
            log.warn("库存不足或不存在: goodsId={}, result={}", goodsId, remainingStock);
            throw new BusinessException(ResultCode.SECKILL_STOCK_EMPTY);
        }

        log.info("库存扣减成功: goodsId={}, remainingStock={}", goodsId, remainingStock);

        try {
            // 5. 生成订单ID
            Long orderId = generateOrderId();

            // 6. 发送 MQ 消息，由订单服务异步完成订单入库
            if (rocketMQTemplate == null) {
                // 回滚库存
                redisTemplate.opsForValue().increment(stockKey);
                throw new BusinessException(ResultCode.ERROR, "消息队列服务未启动，请联系管理员");
            }
            CreateOrderMessage msg = new CreateOrderMessage(orderId, userId, goodsId, goods.getSeckillPrice());
            String json = objectMapper.writeValueAsString(msg);
            rocketMQTemplate.syncSend(
                    MqConstants.SECKILL_ORDER_TOPIC + ":" + MqConstants.TAG_CREATE_ORDER, json);
            log.info("发送创单消息成功: orderId={}", orderId);

            // 7. Redis 已售数量 +1（立即更新，供前端实时展示）
            redisTemplate.opsForValue().increment(soldKey);

            // 允许同一用户多次购买，不作重复购买拦截
            log.info("秒杀成功: userId={}, goodsId={}, orderId={}", userId, goodsId, orderId);
            return String.valueOf(orderId);

        } catch (Exception e) {
            // 回滚 Redis 库存
            redisTemplate.opsForValue().increment(stockKey);
            log.error("秒杀异常，回滚库存: userId={}, goodsId={}", userId, goodsId, e);
            throw new BusinessException(ResultCode.ERROR, "秒杀失败，请重试: " + e.getMessage());
        }
    }

    /**
     * 确保 Redis 中初始化了库存和已售
     */
    private void ensureRedisInitialized(Long goodsId, SeckillGoods goods, String stockKey, String soldKey) {
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(stockKey))) {
            if (goods.getStockCount() != null && goods.getStockCount() > 0) {
                redisTemplate.opsForValue().set(stockKey, goods.getStockCount());
                log.info("预热库存: goodsId={}, stock={}", goodsId, goods.getStockCount());
            }
        }
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(soldKey))) {
            int soldCount = goods.getSoldCount() != null ? goods.getSoldCount() : 0;
            redisTemplate.opsForValue().set(soldKey, soldCount);
            log.info("预热已售: goodsId={}, sold={}", goodsId, soldCount);
        }
    }

    private Long generateOrderId() {
        return SNOWFLAKE.nextId();
    }

    /**
     * 更新数据库库存和已售数量（原子操作，供订单服务回调）
     */
    public void updateGoodsStockAndSold(Long goodsId) {
        seckillGoodsMapper.updateStockAndSold(goodsId);
        log.info("数据库库存-1，已售+1: goodsId={}", goodsId);
    }

    /**
     * 预热秒杀商品库存到 Redis
     */
    public void preloadStockToRedis(Long goodsId) {
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods != null) {
            String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
            String soldKey = RedisConstants.SECKILL_SOLD + goodsId;
            redisTemplate.opsForValue().set(stockKey, goods.getStockCount() != null ? goods.getStockCount() : 0);
            redisTemplate.opsForValue().set(soldKey, goods.getSoldCount() != null ? goods.getSoldCount() : 0);
            log.info("预热 Redis 成功: goodsId={}, stock={}, sold={}",
                    goodsId, goods.getStockCount(), goods.getSoldCount());
        }
    }

    /**
     * 恢复数据库库存（内部调用）
     */
    public void restoreStockInDb(Long goodsId) {
        seckillGoodsMapper.updateStockAndSoldCancel(goodsId);
        log.info("数据库库存已恢复: goodsId={}", goodsId);
    }
}
