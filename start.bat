@echo off
setlocal enabledelayedexpansion
title Seckill System Launcher

REM ==========================================================
REM   Seckill System one-click launcher
REM   Order: middleware (Docker) -> backend services -> AI agent -> frontend
REM
REM   Prerequisites (must be ready on this machine):
REM     1. MySQL    127.0.0.1:3306   database: seckill_system
REM     2. Redis    127.0.0.1:6379
REM     3. Docker Desktop running
REM     4. JDK 17 / Maven / Node.js / Python on PATH
REM ==========================================================

set ROOT=%~dp0
set BACKEND=%ROOT%seckill-system
set FRONTEND=%ROOT%seckill-frontend
set AGENT=%ROOT%seckill-agent-python

echo ============================================================
echo                Seckill System - Launcher
echo ============================================================
echo.

REM ---------- 0. Check Docker ----------
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not detected. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM ---------- 1. Start middleware (Nacos / RocketMQ) ----------
echo [1/5] Starting middleware containers (Nacos + RocketMQ) ...
REM First try to (re)start containers that already exist - avoids name conflicts.
docker start seckill-nacos seckill-namesrv seckill-broker >nul 2>&1
REM Then make sure everything defined in compose is up (creates anything missing).
docker compose -f "%ROOT%docker-compose.yml" up -d >nul 2>&1
if errorlevel 1 (
    echo [INFO] Name conflict detected - recreating middleware containers cleanly ...
    docker rm -f seckill-nacos seckill-namesrv seckill-broker >nul 2>&1
    docker compose -f "%ROOT%docker-compose.yml" up -d
)
echo    Middleware containers are up.
echo.

REM ---------- 2. Wait for Nacos (port 8848) ----------
echo [2/5] Waiting for Nacos (127.0.0.1:8848) ...
set /a TRY=0
:WAIT_NACOS
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 8848 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 goto NACOS_OK
set /a TRY+=1
if !TRY! geq 60 (
    echo [WARN] Nacos wait timed out (~120s). Continuing anyway.
    goto NACOS_OK
)
timeout /t 2 >nul
echo    ... still waiting for Nacos (!TRY!/60)
goto WAIT_NACOS
:NACOS_OK
echo    Nacos is ready.
echo.

REM ---------- 3. Start backend services ----------
echo [3/5] Starting backend microservices (each in its own window) ...
start "seckill-user"        cmd /k "cd /d %BACKEND%\seckill-user && mvn spring-boot:run"
timeout /t 8 >nul
start "seckill-goods"       cmd /k "cd /d %BACKEND%\seckill-goods && mvn spring-boot:run"
timeout /t 8 >nul
start "seckill-order"       cmd /k "cd /d %BACKEND%\seckill-order && mvn spring-boot:run"
timeout /t 8 >nul
start "seckill-admin-agent" cmd /k "cd /d %BACKEND%\seckill-admin-agent && mvn spring-boot:run"
timeout /t 8 >nul
start "seckill-gateway"     cmd /k "cd /d %BACKEND%\seckill-gateway && mvn spring-boot:run"
echo    5 backend services launched. First compile is slow; wait for Nacos registration.
echo.

REM ---------- 4. Start AI agent (Python, port 8099) ----------
echo [4/5] Starting AI agent (Python FastAPI :8099) ...
if exist "%AGENT%\main.py" (
    start "ai-agent" cmd /k "cd /d %AGENT% && python main.py"
) else (
    echo    [SKIP] %AGENT%\main.py not found
)
echo.

REM ---------- 5. Start frontend ----------
echo [5/5] Starting frontend dev server (Vite :3000) ...
if not exist "%FRONTEND%\node_modules" (
    echo    First run: installing frontend deps (npm install) ...
    start "frontend" cmd /k "cd /d %FRONTEND% && npm install && npm run dev"
) else (
    start "frontend" cmd /k "cd /d %FRONTEND% && npm run dev"
)
echo.

echo ============================================================
echo   All start commands have been issued.
echo.
echo   - Frontend : http://localhost:3000
echo   - Gateway  : http://localhost:8080
echo   - Nacos    : http://localhost:8848/nacos  (nacos/nacos)
echo   - AI agent : http://localhost:8099
echo.
echo   Note: backend needs ~1-2 min to compile and register on first run.
echo ============================================================
echo.
pause
