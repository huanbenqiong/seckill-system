package com.seckill.goods.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.seckill.goods.entity.SeckillGoods;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 秒杀商品 Mapper
 */
public interface SeckillGoodsMapper extends BaseMapper<SeckillGoods> {

    /**
     * 原子更新库存和已售数量
     */
    @Update("UPDATE sk_seckill_goods SET stock_count = stock_count - 1, sold_count = COALESCE(sold_count, 0) + 1 WHERE id = #{goodsId} AND stock_count > 0")
    void updateStockAndSold(@Param("goodsId") Long goodsId);

    /**
     * 恢复库存（订单取消时调用）
     */
    @Update("UPDATE sk_seckill_goods SET stock_count = stock_count + 1, sold_count = GREATEST(COALESCE(sold_count, 1) - 1, 0) WHERE id = #{goodsId}")
    void updateStockAndSoldCancel(@Param("goodsId") Long goodsId);
}
