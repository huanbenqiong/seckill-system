package com.seckill.common.constant;

/**
 * Redis 缓存相关常量
 */
public class RedisConstants {

    private RedisConstants() {}

    // ========== 用户相关 ==========
    /**
     * 用户 Token 黑名单
     */
    public static final String USER_TOKEN_BLACKLIST = "token:blacklist:";

    /**
     * 用户登录验证码
     */
    public static final String USER_LOGIN_CODE = "user:login:code:";

    /**
     * 用户Token
     */
    public static final String USER_TOKEN = "user:token:";

    // ========== 秒杀商品库存相关 ==========
    /**
     * 秒杀商品库存 Key
     */
    public static final String SECKILL_STOCK = "seckill:stock:";

    /**
     * 秒杀商品库存 Lua 脚本，用于原子性扣减
     */
    public static final String SECKILL_STOCK_LUA = 
            "if redis.call('exists', KEYS[1]) == 1 then " +
            "    local stock = tonumber(redis.call('get', KEYS[1])) " +
            "    if stock > 0 then " +
            "        redis.call('decr', KEYS[1]) " +
            "        return stock - 1 " +
            "    else " +
            "        return -1 " +
            "    end " +
            "else " +
            "    return -2 " +
            "end";

    /**
     * 秒杀活动开始标志
     */
    public static final String SECKILL_START = "seckill:start:";

    /**
     * 用户已购买标记（防重复购买）
     */
    public static final String SECKILL_USER_PURCHASED = "seckill:purchased:";

    /**
     * 限流计数器
     */
    public static final String SECKILL_RATE_LIMIT = "seckill:ratelimit:";

    // ========== 订单相关 ==========
    /**
     * 订单超时释放锁
     */
    public static final String ORDER_TIMEOUT_LOCK = "order:timeout:lock:";

    /**
     * 订单流水号
     */
    public static final String ORDER_SEQ = "order:seq:";

    // ========== 分布式锁 ==========
    /**
     * 商品秒杀分布式锁前缀
     */
    public static final String LOCK_SECKILL = "lock:seckill:";

    /**
     * 通用分布式锁前缀
     */
    public static final String LOCK_PREFIX = "lock:";

    // ========== 缓存过期时间 ==========
    /**
     * Token 过期时间（秒）
     */
    public static final long TOKEN_EXPIRE = 24 * 60 * 60;

    /**
     * 验证码过期时间（秒）
     */
    public static final long CODE_EXPIRE = 5 * 60;

    /**
     * 订单超时时间（秒）
     */
    public static final long ORDER_TIMEOUT = 15 * 60;
}
