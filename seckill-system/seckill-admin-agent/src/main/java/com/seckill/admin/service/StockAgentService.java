package com.seckill.admin.service;

import com.seckill.admin.entity.SeckillGoods;

import java.util.List;

public interface StockAgentService {

    /**
     * 查询指定商品的当前剩余库存（优先从 Redis 读取）
     */
    Integer getStock(Long goodsId);

    /**
     * 查询所有低库存商品（库存低于阈值的商品列表）
     * @param threshold 库存阈值
     */
    List<SeckillGoods> getLowStockGoods(int threshold);

    /**
     * 追加指定商品的库存（同时更新 Redis 和数据库）
     * @param goodsId 商品ID
     * @param addCount 增加的数量（正数）
     * @return 追加后的库存
     */
    int addStock(Long goodsId, int addCount);

    /**
     * 批量追加低库存商品的库存
     * @param threshold 库存阈值
     * @param targetStock 目标库存数量
     * @return 补货结果列表
     */
    List<String> batchRestock(int threshold, int targetStock);
}
