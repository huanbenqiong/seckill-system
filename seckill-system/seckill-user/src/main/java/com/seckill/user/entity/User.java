package com.seckill.user.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 用户实体类
 */
@Data
@TableName("sk_user")
public class User implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 用户ID
     */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 用户昵称
     */
    private String nickname;

    /**
     * 密码 (加密存储)
     */
    private String password;

    /**
     * 随机盐
     */
    private String salt;

    /**
     * 头像
     */
    private String head;

    /**
     * 角色: 0-买家, 1-卖家
     */
    private Integer role;

    /**
     * 店铺名称（卖家专用）
     */
    private String shopName;

    /**
     * 注册时间
     */
    private LocalDateTime registerDate;

    /**
     * 上次登录时间
     */
    private LocalDateTime lastLoginDate;

    /**
     * 登录次数
     */
    private Integer loginCount;
}
