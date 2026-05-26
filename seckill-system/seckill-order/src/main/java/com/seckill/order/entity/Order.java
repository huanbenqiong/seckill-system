package com.seckill.order.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单实体类
 */
@Data
@TableName("sk_order")
public class Order implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 订单ID
     */
    @TableId(type = IdType.INPUT)
    private Long id;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 秒杀活动ID
     */
    private Long seckillId;

    /**
     * 秒杀价格
     */
    private BigDecimal seckillPrice;

    /**
     * 订单金额
     */
    private BigDecimal amount;

    /**
     * 订单状态: 0-待支付, 1-已支付, 2-已取消, 3-已超时
     */
    private Integer status;

    /**
     * 支付时间
     */
    private LocalDateTime payTime;

    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /**
     * 更新时间
     */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
