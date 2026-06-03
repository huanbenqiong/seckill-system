package com.seckill.order.mq;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seckill.common.constant.MqConstants;
import com.seckill.common.mq.CreateOrderMessage;
import com.seckill.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@RocketMQMessageListener(
        topic = MqConstants.SECKILL_ORDER_TOPIC,
        consumerGroup = MqConstants.ORDER_CREATE_CONSUMER_GROUP,
        selectorExpression = MqConstants.TAG_CREATE_ORDER
)
public class OrderCreateConsumer implements RocketMQListener<String> {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OrderCreateConsumer.class);

    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(String messageStr) {
        log.info("收到创单消息: {}", messageStr);
        try {
            CreateOrderMessage msg = objectMapper.readValue(messageStr, CreateOrderMessage.class);
            orderService.createSeckillOrder(msg.getUserId(), msg.getSeckillId(), msg.getOrderId(), msg.getAmount());
        } catch (Exception e) {
            log.error("处理创单消息失败: {}", messageStr, e);
            // 抛出异常触发 RocketMQ 重试
            throw new RuntimeException("创单失败，触发重试", e);
        }
    }
}
