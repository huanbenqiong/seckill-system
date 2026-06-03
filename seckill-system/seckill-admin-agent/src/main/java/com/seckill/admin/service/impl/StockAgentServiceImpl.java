package com.seckill.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seckill.admin.entity.SeckillGoods;
import com.seckill.admin.mapper.SeckillGoodsMapper;
import com.seckill.admin.service.StockAgentService;
import com.seckill.common.constant.RedisConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockAgentServiceImpl implements StockAgentService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StockAgentServiceImpl.class);

    private final SeckillGoodsMapper seckillGoodsMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public Integer getStock(Long goodsId) {
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;
        Object stock = redisTemplate.opsForValue().get(stockKey);
        if (stock != null) {
            return Integer.parseInt(stock.toString());
        }
        // Redis 没有则查数据库
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        return goods != null ? goods.getStockCount() : null;
    }

    @Override
    public List<SeckillGoods> getLowStockGoods(int threshold) {
        List<SeckillGoods> all = seckillGoodsMapper.selectList(null);
        List<SeckillGoods> lowStock = new ArrayList<>();
        for (SeckillGoods goods : all) {
            Integer stock = getStock(goods.getId());
            if (stock != null && stock <= threshold) {
                goods.setStockCount(stock);
                lowStock.add(goods);
            }
        }
        return lowStock;
    }

    @Override
    public int addStock(Long goodsId, int addCount) {
        String stockKey = RedisConstants.SECKILL_STOCK + goodsId;

        // Redis 原子递增
        Long newStock = redisTemplate.opsForValue().increment(stockKey, addCount);
        if (newStock == null) {
            // Redis 没有 key，先初始化再增加
            SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
            if (goods != null) {
                redisTemplate.opsForValue().set(stockKey, goods.getStockCount() + addCount);
                newStock = goods.getStockCount() + addCount + 0L;
            }
        }

        // 同步更新数据库
        SeckillGoods goods = seckillGoodsMapper.selectById(goodsId);
        if (goods != null) {
            goods.setStockCount(goods.getStockCount() + addCount);
            seckillGoodsMapper.updateById(goods);
            log.info("[AI补货] goodsId={} 追加库存 {}，当前库存={}", goodsId, addCount, goods.getStockCount());
        }

        return newStock != null ? newStock.intValue() : 0;
    }

    @Override
    public List<String> batchRestock(int threshold, int targetStock) {
        List<SeckillGoods> lowStockGoods = getLowStockGoods(threshold);
        List<String> results = new ArrayList<>();
        for (SeckillGoods goods : lowStockGoods) {
            int currentStock = goods.getStockCount() != null ? goods.getStockCount() : 0;
            int needAdd = targetStock - currentStock;
            if (needAdd > 0) {
                addStock(goods.getId(), needAdd);
                results.add("商品ID=" + goods.getId() + "，从 " + currentStock + " 补至 " + targetStock);
            }
        }
        if (results.isEmpty()) {
            results.add("当前没有库存低于" + threshold + "的商品，无需补货");
        }
        return results;
    }
}
