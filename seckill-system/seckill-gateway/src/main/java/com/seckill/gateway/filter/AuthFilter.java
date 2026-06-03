package com.seckill.gateway.filter;

import com.seckill.common.utils.JwtUtils;
import io.jsonwebtoken.JwtException;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

/**
 * 认证过滤器 - 验证 Token、提取用户信息
 */
@Component
public class AuthFilter implements GlobalFilter, Ordered {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthFilter.class);

    /**
     * 无需认证的路径
     */
    private static final List<String> WHITE_LIST = List.of(
            "/user/login",
            "/user/register",
            "/goods/list",
            "/goods/detail",
            "/seller/dashboard",
            "/seller/products",
            "/seller/orders",
            "/seller/statistics",
            "/seller/images"   // 商品图片为公开资源，浏览器 <img> 请求不携带 token
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();

        log.debug("AuthFilter 处理请求: {} {}", method, path);

        // 白名单直接放行
        for (String whitePath : WHITE_LIST) {
            if (path.contains(whitePath)) {
                return chain.filter(exchange);
            }
        }

        // 获取 Token (支持 Header 和 Cookie)
        String token = extractToken(request);

        if (token == null) {
            log.warn("请求路径: {}, Token 不存在", path);
            return unauthorized(exchange.getResponse(), "请先登录");
        }

        // 验证 Token
        if (!JwtUtils.validateToken(token)) {
            log.warn("请求路径: {}, Token 验证失败", path);
            return unauthorized(exchange.getResponse(), "登录已过期，请重新登录");
        }

        // 解析 Token 获取用户信息
        Long userId;
        String username;
        try {
            userId = JwtUtils.getUserId(token);
            username = JwtUtils.getUsername(token);
        } catch (JwtException e) {
            log.warn("请求路径: {}, Token 解析失败: {}", path, e.getMessage());
            return unauthorized(exchange.getResponse(), "登录已过期，请重新登录");
        }

        if (userId == null) {
            log.warn("请求路径: {}, Token 中用户ID为空", path);
            return unauthorized(exchange.getResponse(), "登录已过期，请重新登录");
        }

        // 将用户信息添加到请求头，传递给下游服务
        ServerHttpRequest modifiedRequest = request.mutate()
                .header("X-User-Id", userId.toString())
                .header("X-Username", username != null ? username : "")
                .build();

        log.debug("请求路径: {}, 用户ID: {}, 用户名: {}", path, userId, username);

        return chain.filter(exchange.mutate().request(modifiedRequest).build());
    }

    @Override
    public int getOrder() {
        return -100;
    }

    /**
     * 从请求中提取 Token
     * 优先从 Authorization Header 获取，其次从 Cookie 获取
     */
    private String extractToken(ServerHttpRequest request) {
        // 1. 从 Authorization Header 获取
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (!token.isEmpty()) {
                return token;
            }
        }

        // 2. 从 Cookie 获取
        String cookie = request.getHeaders().getFirst("Cookie");
        if (cookie != null) {
            String[] cookies = cookie.split(";");
            for (String c : cookies) {
                String[] parts = c.trim().split("=");
                if (parts.length == 2 && "token".equals(parts[0].trim())) {
                    return parts[1].trim();
                }
            }
        }

        // 3. 从查询参数获取（仅开发调试）
        String queryToken = request.getQueryParams().getFirst("token");
        if (queryToken != null && !queryToken.isEmpty()) {
            return queryToken;
        }

        return null;
    }

    /**
     * 返回未授权响应
     */
    private Mono<Void> unauthorized(ServerHttpResponse response, String message) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        response.getHeaders().add("Access-Control-Allow-Credentials", "true");
        response.getHeaders().add("Access-Control-Allow-Origin", "*");

        String body = "{\"code\":401,\"message\":\"" + message + "\"}";
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8))));
    }
}
