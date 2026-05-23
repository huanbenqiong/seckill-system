package com.seckill.order.mq;

import com.seckill.common.constant.MqConstants;
import com.seckill.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;

/**
 * 订单消息消费者
 */
@Slf4j
@Component
@RequiredArgsConstructor
@RocketMQMessageListener(
        topic = MqConstants.SECKILL_ORDER_TOPIC,
        consumerGroup = MqConstants.ORDER_CONSUMER_GROUP
)
public class OrderMessageConsumer implements RocketMQListener<String> {

    private final OrderService orderService;

    @Override
    public void onMessage(String orderId) {
        log.info("收到订单超时检查消息: orderId={}", orderId);
        try {
            orderService.cancelOrder(orderId);
        } catch (Exception e) {
            log.error("处理订单超时消息失败: orderId={}", orderId, e);
            // 这里可以实现重试逻辑
        }
    }
}
