package com.seckill.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * 全局限流过滤器 - 使用 Redis + 令牌桶算法实现分布式限流
 */
@Slf4j
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    /**
     * 限流 key 前缀
     */
    private static final String RATE_LIMIT_KEY = "gateway:ratelimit:";

    /**
     * 每秒允许的请求数
     */
    private static final int QPS = 100;

    /**
     * 桶容量
     */
    private static final int BUCKET_CAPACITY = 200;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String clientIp = getClientIp(request);
        String path = request.getURI().getPath();

        // 对秒杀接口进行特殊限流
        if (path.contains("/seckill")) {
            return handleRateLimit(exchange, chain, clientIp + ":seckill", 50);
        }

        // 普通接口限流
        return handleRateLimit(exchange, chain, clientIp, QPS);
    }

    /**
     * 处理限流逻辑
     */
    private Mono<Void> handleRateLimit(ServerWebExchange exchange, GatewayFilterChain chain,
                                        String key, int qps) {
        // TODO: 实际应该使用 Redis 令牌桶实现
        // 这里简化处理，实际项目中需要使用 Redisson 或 Lua 脚本实现
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -99; // 认证过滤器之后
    }

    /**
     * 获取客户端 IP
     */
    private String getClientIp(ServerHttpRequest request) {
        String ip = request.getHeaders().getFirst("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeaders().getFirst("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddress().getAddress().getHostAddress();
        }
        // 多个代理时取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    /**
     * 返回限流响应
     */
    private Mono<Void> rateLimitResponse(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":429,\"message\":\"请求过于频繁，请稍后重试\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
