package com.seckill.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.seckill.user.entity.SellerOrder;
import org.apache.ibatis.annotations.Mapper;

/**
 * 商家订单 Mapper
 */
@Mapper
public interface SellerOrderMapper extends BaseMapper<SellerOrder> {
}
