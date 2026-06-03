package com.seckill.admin.service;

import com.seckill.admin.entity.SeckillGoods;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface DataAgentService {

    /**
     * 获取今日秒杀大盘汇总数据
     */
    DashboardData getDashboard();

    /**
     * 获取指定商品的统计信息
     * @param goodsId 商品ID
     */
    GoodsStats getGoodsStats(Long goodsId);

    /**
     * 获取指定时间范围内的商品销售排行
     * @param start 开始时间
     * @param end 结束时间
     * @param limit 返回数量
     */
    List<GoodsSalesRank> getSalesRank(LocalDateTime start, LocalDateTime end, int limit);

    /**
     * 获取所有商品列表（带实时库存）
     */
    List<SeckillGoods> getAllGoods();

    /**
     * 批量延期商品活动结束时间
     * @param goodsIds 商品ID列表
     * @param extendDays 延期天数
     */
    List<String> extendActivityTime(List<Long> goodsIds, int extendDays);

    // ---------- 内部 DTO ----------

    record DashboardData(
            int totalOrders,
            int paidOrders,
            int pendingOrders,
            int cancelledOrders,
            BigDecimal totalSalesAmount,
            int activeGoodsCount,
            int lowStockGoodsCount,
            List<String> hotGoodsNames
    ) {}

    record GoodsStats(
            Long goodsId,
            String goodsName,
            int stockCount,
            int soldCount,
            BigDecimal seckillPrice,
            int activityDurationMinutes,
            String sellOutSpeed,
            BigDecimal conversionRate
    ) {}

    record GoodsSalesRank(
            Long goodsId,
            String goodsName,
            int soldCount,
            BigDecimal seckillPrice,
            BigDecimal totalSales
    ) {}
}
