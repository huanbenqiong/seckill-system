package com.seckill.common.config;

import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 全局配置
 *
 * 将所有 Long 类型序列化为字符串，避免 JavaScript 64 位整数精度丢失问题。
 * （JavaScript Number 最大精确整数为 2^53，雪花 ID 为 64 位，超出范围会导致精度丢失）
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer longToStringCustomizer() {
        return builder -> {
            // Long / long 类型 → 序列化为 JSON 字符串
            builder.serializerByType(Long.class, ToStringSerializer.instance);
            builder.serializerByType(long.class, ToStringSerializer.instance);
        };
    }
}
