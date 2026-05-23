package com.seckill.common.constant;

/**
 * 消息队列相关常量
 */
public class MqConstants {

    private MqConstants() {}

    // ========== RocketMQ Topic ==========
    /**
     * 秒杀订单 Topic
     */
    public static final String SECKILL_ORDER_TOPIC = "seckill-order-topic";

    // ========== 消费者组 ==========
    /**
     * 订单消费者组
     */
    public static final String ORDER_CONSUMER_GROUP = "seckill-order-consumer-group";

    // ========== Tag ==========
    /**
     * 创建订单 Tag
     */
    public static final String TAG_CREATE_ORDER = "create_order";

    /**
     * 取消订单 Tag
     */
    public static final String TAG_CANCEL_ORDER = "cancel_order";

    /**
     * 支付成功 Tag
     */
    public static final String TAG_PAY_SUCCESS = "pay_success";
}
