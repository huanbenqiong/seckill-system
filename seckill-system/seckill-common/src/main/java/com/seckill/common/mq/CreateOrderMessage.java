package com.seckill.common.mq;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderMessage implements Serializable {

    private Long orderId;
    private Long userId;
    private Long seckillId;
    private BigDecimal amount;
}
