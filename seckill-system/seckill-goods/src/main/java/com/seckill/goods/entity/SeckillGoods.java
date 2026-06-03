package com.seckill.goods.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 秒杀商品实体类
 */
@Data
@TableName("sk_seckill_goods")
public class SeckillGoods implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 秒杀活动ID
     */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 关联的商品ID
     */
    private Long goodsId;

    /**
     * 秒杀价格
     */
    private BigDecimal seckillPrice;

    /**
     * 剩余秒杀库存数量
     */
    private Integer stockCount;

    /**
     * 已秒杀数量
     */
    private Integer soldCount;

    /**
     * 秒杀活动开始时间
     */
    private LocalDateTime startDate;

    /**
     * 秒杀活动结束时间
     */
    private LocalDateTime endDate;

    /**
     * 订单超时时间（秒）
     */
    private Integer timeoutSeconds;

    /**
     * 每人限购数量
     */
    private Integer limitCount;

    /**
     * 乐观锁版本号
     */
    private Integer version;

    /**
     * 状态: 0-已下线, 1-准备中, 2-进行中, 3-已结束（由起止时间动态计算）
     */
    private Integer status;

    /**
     * 商品名称
     */
    private String name;

    /**
     * 商品分类（手机数码/家用电器/电脑办公/服装鞋帽/食品生鲜/美妆护肤/运动户外/家具家居）
     */
    private String category;

    /**
     * 商品图片URL
     */
    private String imageUrl;

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
