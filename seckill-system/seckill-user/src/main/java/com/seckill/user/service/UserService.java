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
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);

    private final UserMapper userMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    public LoginResponse login(LoginRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "用户名不能为空");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "密码不能为空");
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getNickname, request.getUsername().trim());
        User user = userMapper.selectOne(wrapper);

        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_EXIST, "用户不存在，请先注册");
        }

        String encryptedPassword = encryptPassword(request.getPassword(), user.getSalt());
        if (!encryptedPassword.equals(user.getPassword())) {
            throw new BusinessException(ResultCode.USER_PASSWORD_ERROR, "密码错误");
        }

        if (request.getRole() != null && !request.getRole().equals(user.getRole())) {
            String roleName = request.getRole() == 1 ? "商家" : "买家";
            throw new BusinessException("该账号不是" + roleName + "账号");
        }

        user.setLastLoginDate(LocalDateTime.now());
        user.setLoginCount((user.getLoginCount() == null ? 0 : user.getLoginCount()) + 1);
        userMapper.updateById(user);

        String token = JwtUtils.generateToken(user.getId(), user.getNickname());

        String tokenKey = RedisConstants.USER_TOKEN + user.getId();
        redisTemplate.opsForValue().set(tokenKey, token, RedisConstants.TOKEN_EXPIRE, TimeUnit.SECONDS);

        log.info("用户登录成功: userId={}, username={}, role={}", user.getId(), user.getNickname(), user.getRole());

        return new LoginResponse(token, "Bearer", RedisConstants.TOKEN_EXPIRE,
                user.getId(), user.getNickname(), user.getRole(), user.getShopName());
    }

    public LoginResponse register(LoginRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "用户名不能为空");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "密码长度不能少于6位");
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getNickname, request.getUsername().trim());
        Long count = userMapper.selectCount(wrapper);
        if (count > 0) {
            throw new BusinessException("用户名已存在");
        }

        String salt = generateSalt();

        User user = new User();
        user.setNickname(request.getUsername().trim());
        user.setPassword(encryptPassword(request.getPassword(), salt));
        user.setSalt(salt);
        user.setLoginCount(0);
        user.setRegisterDate(LocalDateTime.now());
        user.setRole(request.getRole() != null ? request.getRole() : 0);
        if (user.getRole() == 1 && request.getUsername().contains("@shop")) {
            user.setShopName(request.getUsername().replace("@shop", "") + "的小店");
        }

        userMapper.insert(user);

        log.info("用户注册成功: userId={}, username={}, role={}", user.getId(), user.getNickname(), user.getRole());

        String token = JwtUtils.generateToken(user.getId(), user.getNickname());
        String tokenKey = RedisConstants.USER_TOKEN + user.getId();
        redisTemplate.opsForValue().set(tokenKey, token, RedisConstants.TOKEN_EXPIRE, TimeUnit.SECONDS);

        return new LoginResponse(token, "Bearer", RedisConstants.TOKEN_EXPIRE,
                user.getId(), user.getNickname(), user.getRole(), user.getShopName());
    }

    public boolean validateToken(String token) {
        return JwtUtils.validateToken(token);
    }

    public User getUserById(Long userId) {
        return userMapper.selectById(userId);
    }

    public void updateUser(User user) {
        userMapper.updateById(user);
    }

    public void logout(Long userId) {
        String tokenKey = RedisConstants.USER_TOKEN + userId;
        redisTemplate.delete(tokenKey);
        log.info("用户退出登录: userId={}", userId);
    }

    private String encryptPassword(String password, String salt) {
        String raw = "seckill" + password + salt;
        return org.springframework.util.DigestUtils.md5DigestAsHex(raw.getBytes());
    }

    private String generateSalt() {
        Random random = new Random();
        return String.valueOf(random.nextInt(99999) + 10000);
    }
}
