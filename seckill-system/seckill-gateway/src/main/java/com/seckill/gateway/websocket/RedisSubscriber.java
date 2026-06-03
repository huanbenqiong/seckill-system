package com.seckill.gateway.websocket;

import jakarta.annotation.PostConstruct;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

@Component
public class RedisSubscriber {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RedisSubscriber.class);

    private final RedissonClient redissonClient;
    private final SeckillWebSocketHandler webSocketHandler;

    public RedisSubscriber(RedissonClient redissonClient, SeckillWebSocketHandler webSocketHandler) {
        this.redissonClient = redissonClient;
        this.webSocketHandler = webSocketHandler;
    }

    private static final String SECKILL_TOPIC = "seckill:order:result";

    @PostConstruct
    public void init() {
        RTopic topic = redissonClient.getTopic(SECKILL_TOPIC);
        topic.addListener(String.class, (channel, message) -> {
            log.info("Received redis message on topic {}: {}", channel, message);
            String[] parts = message.split(":", 3);
            if (parts.length >= 2) {
                String userId = parts[0];
                webSocketHandler.sendMessage(userId, message);
            }
        });
    }
}
