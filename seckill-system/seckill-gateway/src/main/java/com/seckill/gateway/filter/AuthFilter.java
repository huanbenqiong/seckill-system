package com.seckill.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * 认证过滤器 - 验证 Token、提取用户信息
 */
@Slf4j
@Component
public class AuthFilter implements GlobalFilter, Ordered {

    /**
     * 无需认证的路径
     */
    private static final List<String> WHITE_LIST = List.of(
            "/user/login",
            "/user/register",
            "/goods/list",
            "/goods/detail"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // 白名单直接放行
        for (String whitePath : WHITE_LIST) {
            if (path.contains(whitePath)) {
                return chain.filter(exchange);
            }
        }

        // 获取 Token
        String token = extractToken(request);
        if (token == null) {
            log.warn("请求路径: {}, Token 不存在", path);
            return unauthorized(exchange.getResponse(), "请先登录");
        }

        // TODO: 调用用户服务验证 Token
        // 这里简化处理，实际应该调用 Redis 或用户服务验证
        if (!validateToken(token)) {
            log.warn("请求路径: {}, Token 验证失败", path);
            return unauthorized(exchange.getResponse(), "登录已过期，请重新登录");
        }

        // 将用户信息添加到请求头，传递给下游服务
        Long userId = getUserIdFromToken(token);
        String username = getUsernameFromToken(token);

        ServerHttpRequest modifiedRequest = request.mutate()
                .header("X-User-Id", userId.toString())
                .header("X-Username", username)
                .build();

        return chain.filter(exchange.mutate().request(modifiedRequest).build());
    }

    @Override
    public int getOrder() {
        return -100; // 优先级最高
    }

    /**
     * 从请求头提取 Token
     */
    private String extractToken(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    /**
     * 验证 Token (简化实现)
     */
    private boolean validateToken(String token) {
        // 实际应该调用用户服务或 Redis 验证
        return token != null && token.length() > 10;
    }

    /**
     * 从 Token 获取用户ID (简化实现)
     */
    private Long getUserIdFromToken(String token) {
        // 实际应该解析 JWT 获取
        return 1L;
    }

    /**
     * 从 Token 获取用户名 (简化实现)
     */
    private String getUsernameFromToken(String token) {
        // 实际应该解析 JWT 获取
        return "user";
    }

    /**
     * 返回未授权响应
     */
    private Mono<Void> unauthorized(ServerHttpResponse response, String message) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":401,\"message\":\"" + message + "\"}";
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }
}
