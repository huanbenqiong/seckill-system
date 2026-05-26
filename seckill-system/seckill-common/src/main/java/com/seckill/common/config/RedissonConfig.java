package com.seckill.common.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Redisson 配置类
 */
@Configuration
public class RedissonConfig {

    @Value("${spring.data.redis.host:127.0.0.1}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.password:}")
    private String redisPassword;

    @Value("${spring.data.redis.database:0}")
    private int redisDatabase;

    @Bean(destroyMethod = "shutdown")
    public RedissonClient redissonClient() {
        Config config = new Config();
        String password = (redisPassword == null || redisPassword.isEmpty()) ? null : redisPassword;
        
        config.useSingleServer()
                .setAddress("redis://" + redisHost + ":" + redisPort)
                .setPassword(password)
                .setDatabase(redisDatabase)
                .setConnectionMinimumIdleSize(5)
                .setConnectionPoolSize(10);
        
        return Redisson.create(config);
    }
}
