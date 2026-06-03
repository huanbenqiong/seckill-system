package com.seckill.order.mq;

import com.seckill.common.constant.MqConstants;
import com.seckill.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@RocketMQMessageListener(
        topic = MqConstants.SECKILL_ORDER_TOPIC,
        consumerGroup = MqConstants.ORDER_CONSUMER_GROUP,
        selectorExpression = MqConstants.TAG_CANCEL_ORDER
)
public class OrderMessageConsumer implements RocketMQListener<String> {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OrderMessageConsumer.class);

    private final OrderService orderService;

    @Override
    public void onMessage(String orderIdStr) {
        log.info("收到订单超时检查消息: orderId={}", orderIdStr);
        try {
            Long orderId = Long.parseLong(orderIdStr);
            orderService.cancelOrder(orderId);
        } catch (NumberFormatException e) {
            log.error("订单ID格式错误: {}", orderIdStr, e);
        } catch (Exception e) {
            log.error("处理订单超时消息失败: orderId={}", orderIdStr, e);
        }
    }
}
