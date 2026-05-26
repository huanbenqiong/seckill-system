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

import java.time.LocalDateTime;
import java.util.Random;
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
        // 1. 参数校验
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "用户名不能为空");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "密码不能为空");
        }

        // 2. 查询用户
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getNickname, request.getUsername().trim());
        User user = userMapper.selectOne(wrapper);

        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_EXIST, "用户不存在，请先注册");
        }

        // 3. 验证密码
        String encryptedPassword = encryptPassword(request.getPassword(), user.getSalt());
        if (!encryptedPassword.equals(user.getPassword())) {
            throw new BusinessException(ResultCode.USER_PASSWORD_ERROR, "密码错误");
        }

        // 4. 检查角色（如果有指定角色）
        if (request.getRole() != null && !request.getRole().equals(user.getRole())) {
            String roleName = request.getRole() == 1 ? "商家" : "买家";
            throw new BusinessException("该账号不是" + roleName + "账号");
        }

        // 5. 更新登录信息
        user.setLastLoginDate(LocalDateTime.now());
        user.setLoginCount((user.getLoginCount() == null ? 0 : user.getLoginCount()) + 1);
        userMapper.updateById(user);

        // 6. 生成 JWT Token
        String token = JwtUtils.generateToken(user.getId(), user.getNickname());

        // 7. 缓存 Token 到 Redis
        String tokenKey = RedisConstants.USER_TOKEN + user.getId();
        redisTemplate.opsForValue().set(tokenKey, token, RedisConstants.TOKEN_EXPIRE, TimeUnit.SECONDS);

        log.info("用户登录成功: userId={}, username={}, role={}", user.getId(), user.getNickname(), user.getRole());

        // 8. 返回登录响应
        return new LoginResponse(token, "Bearer", RedisConstants.TOKEN_EXPIRE, 
                user.getId(), user.getNickname(), user.getRole(), user.getShopName());
    }

    /**
     * 用户注册
     */
    public LoginResponse register(LoginRequest request) {
        // 1. 参数校验
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "用户名不能为空");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "密码长度不能少于6位");
        }

        // 2. 检查用户名是否已存在
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getNickname, request.getUsername().trim());
        Long count = userMapper.selectCount(wrapper);
        if (count > 0) {
            throw new BusinessException("用户名已存在");
        }

        // 3. 生成随机盐
        String salt = generateSalt();

        // 4. 创建用户
        User user = new User();
        user.setNickname(request.getUsername().trim());
        user.setPassword(encryptPassword(request.getPassword(), salt));
        user.setSalt(salt);
        user.setLoginCount(0);
        user.setRegisterDate(LocalDateTime.now());
        
        // 设置角色（默认买家）
        user.setRole(request.getRole() != null ? request.getRole() : 0);
        
        // 如果是卖家，设置店铺名称
        if (user.getRole() == 1 && request.getUsername().contains("@shop")) {
            user.setShopName(request.getUsername().replace("@shop", "") + "的小店");
        }

        userMapper.insert(user);

        log.info("用户注册成功: userId={}, username={}, role={}", user.getId(), user.getNickname(), user.getRole());

        // 5. 自动登录，生成 Token
        String token = JwtUtils.generateToken(user.getId(), user.getNickname());

        // 6. 缓存 Token
        String tokenKey = RedisConstants.USER_TOKEN + user.getId();
        redisTemplate.opsForValue().set(tokenKey, token, RedisConstants.TOKEN_EXPIRE, TimeUnit.SECONDS);

        // 7. 返回登录响应
        return new LoginResponse(token, "Bearer", RedisConstants.TOKEN_EXPIRE, 
                user.getId(), user.getNickname(), user.getRole(), user.getShopName());
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
     * 更新用户信息
     */
    public void updateUser(User user) {
        userMapper.updateById(user);
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
    private String encryptPassword(String password, String salt) {
        String raw = "seckill" + password + salt;
        return org.springframework.util.DigestUtils.md5DigestAsHex(raw.getBytes());
    }

    /**
     * 生成随机盐值
     */
    private String generateSalt() {
        Random random = new Random();
        return String.valueOf(random.nextInt(99999) + 10000);
    }
}
