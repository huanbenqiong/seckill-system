package com.seckill.goods;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * 秒杀商品服务启动类
 */
@EnableDiscoveryClient
@EnableFeignClients(basePackages = "com.seckill.goods.feign")
@SpringBootApplication(scanBasePackages = {"com.seckill.goods", "com.seckill.common"})
@MapperScan("com.seckill.goods.mapper")
public class GoodsApplication {

    public static void main(String[] args) {
        SpringApplication.run(GoodsApplication.class, args);
    }
}
