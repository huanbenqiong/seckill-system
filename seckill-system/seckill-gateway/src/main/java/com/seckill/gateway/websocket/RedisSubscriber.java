package com.seckill.gateway.websocket;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisSubscriber {

    private final RedissonClient redissonClient;
    private final SeckillWebSocketHandler webSocketHandler;

    private static final String SECKILL_TOPIC = "seckill:order:result";

    @PostConstruct
    public void init() {
        RTopic topic = redissonClient.getTopic(SECKILL_TOPIC);
        topic.addListener(String.class, (channel, message) -> {
            log.info("Received redis message on topic {}: {}", channel, message);
            // message format: userId:status:orderId
            String[] parts = message.split(":", 3);
            if (parts.length >= 2) {
                String userId = parts[0];
                webSocketHandler.sendMessage(userId, message);
            }
        });
    }
}
