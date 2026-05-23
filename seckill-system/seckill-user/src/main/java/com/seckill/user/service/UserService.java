package com.seckill.user.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seckill.common.constant.RedisConstants;
import com.seckill.common.exception.BusinessException;
import com.seckill.common.result.ResultCode;
import com.seckill.common.utils.JwtUtils;
import com.seckill.user.dto.LoginRequest;
import com.seckill.user.dto.LoginResponse;
import com.seckill.user.entity.User;
import com.seckill.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.util.concurrent.TimeUnit;

/**
 * 用户服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 用户登录
     */
    public LoginResponse login(LoginRequest request) {
        // 查询用户
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, request.getUsername());
        User user = userMapper.selectOne(wrapper);

        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_EXIST);
        }

        // 验证密码
        String encryptedPassword = encryptPassword(request.getPassword());
        if (!encryptedPassword.equals(user.getPassword())) {
            throw new BusinessException(ResultCode.USER_PASSWORD_ERROR);
        }

        // 验证用户状态
        if (user.getStatus() == 0) {
            throw new BusinessException(ResultCode.USER_DISABLED);
        }

        // 生成 Token
        String token = JwtUtils.generateToken(user.getId(), user.getUsername());

        // 缓存 Token
        String tokenKey = RedisConstants.USER_TOKEN + user.getId();
        redisTemplate.opsForValue().set(tokenKey, token, RedisConstants.TOKEN_EXPIRE, TimeUnit.SECONDS);

        log.info("用户登录成功: userId={}, username={}", user.getId(), user.getUsername());

        // 返回登录响应
        return new LoginResponse(token, "Bearer", RedisConstants.TOKEN_EXPIRE, user.getId(), user.getUsername());
    }

    /**
     * 验证 Token
     */
    public boolean validateToken(String token) {
        return JwtUtils.validateToken(token);
    }

    /**
     * 根据用户ID获取用户信息
     */
    public User getUserById(Long userId) {
        return userMapper.selectById(userId);
    }

    /**
     * 根据用户名获取用户信息
     */
    public User getUserByUsername(String username) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);
        return userMapper.selectOne(wrapper);
    }

    /**
     * 注册用户
     */
    public void register(User user) {
        // 检查用户名是否已存在
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, user.getUsername());
        if (userMapper.selectCount(wrapper) > 0) {
            throw new BusinessException("用户名已存在");
        }

        // 加密密码
        user.setPassword(encryptPassword(user.getPassword()));
        user.setStatus(1);
        userMapper.insert(user);
        log.info("用户注册成功: userId={}, username={}", user.getId(), user.getUsername());
    }

    /**
     * 退出登录
     */
    public void logout(Long userId) {
        String tokenKey = RedisConstants.USER_TOKEN + userId;
        redisTemplate.delete(tokenKey);
        log.info("用户退出登录: userId={}", userId);
    }

    /**
     * MD5 加密密码
     */
    private String encryptPassword(String password) {
        return DigestUtils.md5DigestAsHex(("seckill" + password + "salt").getBytes());
    }
}
