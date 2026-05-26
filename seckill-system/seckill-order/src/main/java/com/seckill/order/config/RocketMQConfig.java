package com.seckill.order.config;

import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.springframework.context.annotation.Configuration;

/**
 * RocketMQ 配置类
 */
@Configuration
public class RocketMQConfig {
    // RocketMQTemplate 会通过自动配置注入
    // 如果注入失败，需要检查 rocketmq-spring-boot-starter 版本是否与 RocketMQ 服务端版本匹配
}
