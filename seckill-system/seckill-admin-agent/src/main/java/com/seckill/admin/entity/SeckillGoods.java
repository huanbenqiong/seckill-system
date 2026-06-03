package com.seckill.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("sk_seckill_goods")
public class SeckillGoods implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private BigDecimal seckillPrice;

    private Integer stockCount;

    private Integer soldCount;

    private Integer status;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    @TableField(exist = false)
    private String goodsName;

    @TableField(exist = false)
    private String category;
}
