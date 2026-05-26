package com.seckill.common.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 工具类
 */
@Slf4j
public class JwtUtils {

    private static final String SECRET = "seckill-system-jwt-secret-key-must-be-at-least-256-bits-long-for-security";
    private static final long EXPIRATION = 24 * 60 * 60 * 1000L; // 24小时
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    /**
     * 生成 Token
     */
    public static String generateToken(Long userId, String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        return createToken(claims, userId.toString());
    }

    /**
     * 生成带自定义 Claims 的 Token
     */
    public static String generateToken(Long userId, String username, Map<String, Object> extraClaims) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.putAll(extraClaims);
        return createToken(claims, userId.toString());
    }

    /**
     * 创建 Token
     */
    private static String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + EXPIRATION);
        
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiration)
                .signWith(KEY, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * 解析 Token
     */
    public static Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.warn("Token 已过期: {}", e.getMessage());
            throw e;
        } catch (JwtException e) {
            log.warn("Token 解析失败: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * 获取用户ID
     */
    public static Long getUserId(String token) {
        Claims claims = parseToken(token);
        Object userId = claims.get("userId");
        if (userId instanceof Integer) {
            return ((Integer) userId).longValue();
        } else if (userId instanceof Long) {
            return (Long) userId;
        }
        return Long.parseLong(claims.getSubject());
    }

    /**
     * 获取用户名
     */
    public static String getUsername(String token) {
        Claims claims = parseToken(token);
        return claims.get("username", String.class);
    }

    /**
     * 获取 Claims
     */
    public static Map<String, Object> getClaims(String token) {
        Claims claims = parseToken(token);
        return new HashMap<>(claims);
    }

    /**
     * 验证 Token 是否有效
     */
    public static boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (Exception e) {
            log.debug("Token 验证失败: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 判断 Token 是否过期
     */
    public static boolean isTokenExpired(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.getExpiration().before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        } catch (Exception e) {
            return true;
        }
    }

    /**
     * 获取 Token 剩余过期时间(秒)
     */
    public static long getRemainingExpiration(String token) {
        try {
            Claims claims = parseToken(token);
            Date expiration = claims.getExpiration();
            long remaining = (expiration.getTime() - System.currentTimeMillis()) / 1000;
            return Math.max(0, remaining);
        } catch (Exception e) {
            return 0;
        }
    }
}
