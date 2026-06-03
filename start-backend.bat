@echo off
setlocal
title Seckill Backend Services Launcher

REM ==========================================================
REM   Start ONLY the backend Spring Boot microservices.
REM   Assumes middleware is already running:
REM     - Nacos      127.0.0.1:8848
REM     - Redis      127.0.0.1:6379
REM     - MySQL      127.0.0.1:3306  (db: seckill_system)
REM     - RocketMQ   127.0.0.1:9876
REM   Each service opens in its own window (kept open via cmd /k).
REM ==========================================================

set BACKEND=%~dp0seckill-system

echo ============================================================
echo            Starting Seckill Backend Services
echo ============================================================
echo.
echo Services will open in separate windows. First compile is slow.
echo Watch each window until it prints "Started ... Application".
echo.

echo [1] seckill-user        (port 8081)
start "seckill-user"        cmd /k "cd /d %BACKEND%\seckill-user && mvn spring-boot:run"
timeout /t 6 >nul

echo [2] seckill-goods       (port 8082)
start "seckill-goods"       cmd /k "cd /d %BACKEND%\seckill-goods && mvn spring-boot:run"
timeout /t 6 >nul

echo [3] seckill-order       (port 8083)
start "seckill-order"       cmd /k "cd /d %BACKEND%\seckill-order && mvn spring-boot:run"
timeout /t 6 >nul

echo [4] seckill-admin-agent (port 8084)
start "seckill-admin-agent" cmd /k "cd /d %BACKEND%\seckill-admin-agent && mvn spring-boot:run"
timeout /t 6 >nul

echo [5] seckill-gateway     (port 8080)  ^<-- API entry point
start "seckill-gateway"     cmd /k "cd /d %BACKEND%\seckill-gateway && mvn spring-boot:run"

echo.
echo ============================================================
echo   All 5 backend services launched in their own windows.
echo   (user / goods / order / admin-agent + gateway entry)
echo.
echo   API entry  : http://localhost:8080
echo   Nacos list : http://localhost:8848/nacos  (nacos/nacos)
echo ============================================================
echo.
pause
