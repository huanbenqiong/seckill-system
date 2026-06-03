package com.seckill.gateway.filter;

import org.redisson.api.RRateLimiter;
import org.redisson.api.RateIntervalUnit;
import org.redisson.api.RateType;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
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
import reactor.core.scheduler.Schedulers;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 全局限流过滤器 - 使用 Redisson 分布式令牌桶实现按 IP 限流
 */
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RateLimitFilter.class);

    private static final String RATE_LIMIT_KEY = "gateway:ratelimit:";
    private static final int QPS = 100;

    @Autowired
    private RedissonClient redissonClient;

    // 缓存已初始化的限流器，避免每次请求都执行 trySetRate
    private final ConcurrentMap<String, RRateLimiter> rateLimiterCache = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String clientIp = getClientIp(request);
        String path = request.getURI().getPath();

        if (path.contains("/seckill")) {
            return handleRateLimit(exchange, chain, clientIp + ":seckill", 50);
        }

        return handleRateLimit(exchange, chain, clientIp, QPS);
    }

    /**
     * 令牌桶限流：每秒最多放行 qps 个请求
     * 使用 Redisson RRateLimiter（Redis 分布式令牌桶），
     * 包装为异步执行以避免阻塞 Netty 事件循环线程。
     */
    private Mono<Void> handleRateLimit(ServerWebExchange exchange, GatewayFilterChain chain,
                                       String key, int qps) {
        return Mono.fromCallable(() -> getOrCreateRateLimiter(key, qps).tryAcquire())
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(allowed -> {
                    if (Boolean.TRUE.equals(allowed)) {
                        return chain.filter(exchange);
                    }
                    log.warn("限流拦截: ip={}, path={}", key, exchange.getRequest().getURI().getPath());
                    return rateLimitResponse(exchange.getResponse());
                });
    }

    private RRateLimiter getOrCreateRateLimiter(String key, int qps) {
        return rateLimiterCache.computeIfAbsent(key, k -> {
            RRateLimiter rl = redissonClient.getRateLimiter(RATE_LIMIT_KEY + k);
            // trySetRate 幂等：若已存在则不改变；每秒补充 qps 个令牌，桶容量 = qps
            rl.trySetRate(RateType.OVERALL, qps, 1, RateIntervalUnit.SECONDS);
            log.info("初始化限流器: key={}, qps={}/s", k, qps);
            return rl;
        });
    }

    @Override
    public int getOrder() {
        return -99;
    }

    private String getClientIp(ServerHttpRequest request) {
        String ip = request.getHeaders().getFirst("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeaders().getFirst("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddress().getAddress().getHostAddress();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private Mono<Void> rateLimitResponse(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":429,\"message\":\"请求过于频繁，请稍后重试\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
