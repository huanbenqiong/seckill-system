package com.seckill.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 秒杀商品实体（商家端用）
 */
@Data
@TableName("sk_seckill_goods")
public class SellerGoods implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.INPUT)
    private Long id;

    private Long goodsId;

    private BigDecimal seckillPrice;

    private Integer stockCount;

    private Integer soldCount;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Integer timeoutSeconds;

    private Integer limitCount;

    private Integer version;

    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
