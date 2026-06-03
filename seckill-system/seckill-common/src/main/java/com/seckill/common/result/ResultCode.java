package com.seckill.common.result;

/**
 * 响应状态码枚举
 */
public enum ResultCode {

    // ========== 成功 ==========
    SUCCESS(200, "操作成功"),

    // ========== 客户端错误 4xx ==========
    BAD_REQUEST(400, "请求参数错误"),
    PARAM_ERROR(400, "参数错误"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "无权限访问"),
    NOT_FOUND(404, "请求资源不存在"),
    METHOD_NOT_ALLOWED(405, "请求方法不允许"),

    // ========== 业务错误 5xx ==========
    ERROR(500, "服务器内部错误"),

    // ========== 秒杀业务相关 600xx ==========
    SECKILL_NOT_START(60001, "秒杀活动尚未开始"),
    SECKILL_ENDED(60002, "秒杀活动已结束"),
    SECKILL_STOCK_EMPTY(60003, "商品已售罄"),
    SECKILL_REPEAT_ERROR(60004, "您已购买过该商品"),
    SECKILL_LIMIT_EXCEEDED(60005, "购买数量超出限制"),
    SECKILL_ILLEGAL_REQUEST(60006, "请求非法，请稍后重试"),
    SECKILL_SERVER_BUSY(60007, "系统繁忙，请稍后重试"),

    // ========== 用户相关 601xx ==========
    USER_NOT_EXIST(60101, "用户不存在"),
    USER_PASSWORD_ERROR(60102, "密码错误"),
    USER_DISABLED(60103, "用户已被禁用"),
    USER_TOKEN_EXPIRED(60104, "Token 已过期"),
    USER_TOKEN_INVALID(60105, "Token 无效"),

    // ========== 订单相关 602xx ==========
    ORDER_NOT_EXIST(60201, "订单不存在"),
    ORDER_CANCELLED(60202, "订单已取消"),
    ORDER_PAID(60203, "订单已支付"),
    ORDER_TIMEOUT(60204, "订单已超时"),

    // ========== 库存相关 603xx ==========
    STOCK_NOT_ENOUGH(60301, "库存不足"),
    STOCK_DECREASE_FAIL(60302, "库存扣减失败"),
    STOCK_RESTORE_FAIL(60303, "库存恢复失败"),

    // ========== 限流熔断 604xx ==========
    RATE_LIMIT(60401, "请求过于频繁，请稍后重试"),
    CIRCUIT_OPEN(60402, "服务暂不可用，请稍后重试");

    public final Integer code;
    public final String message;

    ResultCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }

    public Integer getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
