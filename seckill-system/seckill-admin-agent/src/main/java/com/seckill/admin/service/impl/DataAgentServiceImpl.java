package com.seckill.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seckill.admin.entity.SeckillGoods;
import com.seckill.admin.entity.SeckillOrder;
import com.seckill.admin.mapper.SeckillGoodsMapper;
import com.seckill.admin.mapper.SeckillOrderMapper;
import com.seckill.admin.service.DataAgentService;
import com.seckill.common.constant.RedisConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DataAgentServiceImpl implements DataAgentService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DataAgentServiceImpl.class);

    private final SeckillOrderMapper orderMapper;
    private final SeckillGoodsMapper goodsMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public DashboardData getDashboard() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);

        // 查询今日所有订单
        LambdaQueryWrapper<SeckillOrder> orderWrapper = new LambdaQueryWrapper<>();
        orderWrapper.ge(SeckillOrder::getCreateTime, todayStart).lt(SeckillOrder::getCreateTime, todayEnd);
        List<SeckillOrder> todayOrders = orderMapper.selectList(orderWrapper);

        int totalOrders = todayOrders.size();
        int paidOrders = (int) todayOrders.stream().filter(o -> o.getStatus() != null && o.getStatus() == 2).count();
        int pendingOrders = (int) todayOrders.stream().filter(o -> o.getStatus() != null && o.getStatus() == 0).count();
        int cancelledOrders = (int) todayOrders.stream().filter(o -> o.getStatus() != null && o.getStatus() == -1).count();

        BigDecimal totalSalesAmount = todayOrders.stream()
                .filter(o -> o.getAmount() != null)
                .map(SeckillOrder::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 查询活跃商品数量
        List<SeckillGoods> allGoods = goodsMapper.selectList(null);
        LocalDateTime now = LocalDateTime.now();
        int activeGoodsCount = (int) allGoods.stream()
                .filter(g -> g.getStatus() != null && g.getStatus() == 1
                        && g.getStartDate() != null && g.getStartDate().isBefore(now)
                        && g.getEndDate() != null && g.getEndDate().isAfter(now))
                .count();

        // 低库存商品
        int lowStockGoodsCount = 0;
        List<String> hotGoodsNames = new ArrayList<>();
        for (SeckillGoods g : allGoods) {
            Integer stock = getStockFromRedis(g.getId());
            if (stock != null && stock <= 10) {
                lowStockGoodsCount++;
            }
            if (g.getSoldCount() != null && g.getSoldCount() > 0) {
                hotGoodsNames.add("商品ID=" + g.getId() + "(已售" + g.getSoldCount() + ")");
            }
        }

        // 模拟 QPS
        int qpsSimulated = totalOrders > 0 ? (int) (totalOrders * 0.8 + new Random().nextInt(50)) : new Random().nextInt(20);

        return new DashboardData(
                totalOrders,
                paidOrders,
                pendingOrders,
                cancelledOrders,
                totalSalesAmount,
                activeGoodsCount,
                lowStockGoodsCount,
                hotGoodsNames.stream().limit(5).collect(Collectors.toList())
        );
    }

    @Override
    public GoodsStats getGoodsStats(Long goodsId) {
        SeckillGoods goods = goodsMapper.selectById(goodsId);
        if (goods == null) {
            return null;
        }

        Integer stock = getStockFromRedis(goodsId);
        int stockCount = stock != null ? stock : (goods.getStockCount() != null ? goods.getStockCount() : 0);
        int soldCount = goods.getSoldCount() != null ? goods.getSoldCount() : 0;

        // 计算活动时长（分钟）
        int activityDurationMinutes = 0;
        String sellOutSpeed = "未开始";
        if (goods.getStartDate() != null && goods.getEndDate() != null) {
            activityDurationMinutes = (int) ChronoUnit.MINUTES.between(goods.getStartDate(), goods.getEndDate());
            if (soldCount > 0 && goods.getStockCount() != null && goods.getStockCount() > 0) {
                if (stockCount == 0) {
                    long usedMinutes = ChronoUnit.MINUTES.between(goods.getStartDate(), LocalDateTime.now());
                    sellOutSpeed = usedMinutes > 0 ? usedMinutes + "分钟售罄" : "瞬间售罄";
                } else {
                    BigDecimal soldRate = new BigDecimal(soldCount)
                            .divide(new BigDecimal(goods.getStockCount()), 2, RoundingMode.HALF_UP)
                            .multiply(new BigDecimal("100"));
                    sellOutSpeed = "已售" + soldRate.setScale(1, RoundingMode.HALF_UP) + "%";
                }
            } else if (stockCount == 0) {
                sellOutSpeed = "已售罄";
            }
        }

        BigDecimal conversionRate = BigDecimal.ZERO;
        if (goods.getStockCount() != null && goods.getStockCount() > 0) {
            conversionRate = new BigDecimal(soldCount)
                    .divide(new BigDecimal(goods.getStockCount()), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return new GoodsStats(
                goodsId,
                "商品ID=" + goodsId,
                stockCount,
                soldCount,
                goods.getSeckillPrice(),
                activityDurationMinutes,
                sellOutSpeed,
                conversionRate
        );
    }

    @Override
    public List<GoodsSalesRank> getSalesRank(LocalDateTime start, LocalDateTime end, int limit) {
        LambdaQueryWrapper<SeckillOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(SeckillOrder::getCreateTime, start).lt(SeckillOrder::getCreateTime, end);
        List<SeckillOrder> orders = orderMapper.selectList(wrapper);

        Map<Long, Integer> soldCountMap = new HashMap<>();
        Map<Long, BigDecimal> salesMap = new HashMap<>();
        for (SeckillOrder order : orders) {
            soldCountMap.merge(order.getSeckillId(), 1, Integer::sum);
            salesMap.merge(order.getSeckillId(), order.getAmount() != null ? order.getAmount() : BigDecimal.ZERO, BigDecimal::add);
        }

        List<SeckillGoods> allGoods = goodsMapper.selectList(null);
        Map<Long, String> nameMap = allGoods.stream().collect(Collectors.toMap(SeckillGoods::getId, g -> "商品ID=" + g.getId()));
        Map<Long, BigDecimal> priceMap = allGoods.stream().collect(Collectors.toMap(SeckillGoods::getId, g -> g.getSeckillPrice() != null ? g.getSeckillPrice() : BigDecimal.ZERO));

        return soldCountMap.entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                .limit(limit)
                .map(e -> new GoodsSalesRank(
                        e.getKey(),
                        nameMap.getOrDefault(e.getKey(), "未知商品"),
                        e.getValue(),
                        priceMap.getOrDefault(e.getKey(), BigDecimal.ZERO),
                        salesMap.getOrDefault(e.getKey(), BigDecimal.ZERO)
                ))
                .collect(Collectors.toList());
    }

    @Override
    public List<SeckillGoods> getAllGoods() {
        List<SeckillGoods> list = goodsMapper.selectList(null);
        for (SeckillGoods goods : list) {
            Integer stock = getStockFromRedis(goods.getId());
            if (stock != null) {
                goods.setStockCount(stock);
            }
        }
        return list;
    }

    @Override
    public List<String> extendActivityTime(List<Long> goodsIds, int extendDays) {
        List<String> results = new ArrayList<>();
        for (Long goodsId : goodsIds) {
            SeckillGoods goods = goodsMapper.selectById(goodsId);
            if (goods == null) {
                results.add("商品ID=" + goodsId + " 不存在");
                continue;
            }
            LocalDateTime newEndDate = goods.getEndDate().plusDays(extendDays);
            goods.setEndDate(newEndDate);
            goodsMapper.updateById(goods);
            results.add("商品ID=" + goodsId + " 活动已延期至 " + newEndDate.toLocalDate() + "，延长" + extendDays + "天");
        }
        return results;
    }

    private Integer getStockFromRedis(Long goodsId) {
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        Object stock = redisTemplate.opsForValue().get(stockKey);
        return stock != null ? Integer.parseInt(stock.toString()) : null;
    }
}
