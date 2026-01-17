@echo off
REM Setup script for CarLogic external network hosting (Windows)
REM This script configures the application for access from other systems on the network

echo.
echo CarLogic External Network Hosting Setup (Windows)
echo =================================================
echo.

REM Get system information
for /f "tokens=*" %%i in ('hostname') do set HOSTNAME=%%i
for /f "tokens=*" %%i in ('wmic os get caption ^| findstr /v Caption') do set OS=%%i

echo Detected System Information:
echo   Hostname: %HOSTNAME%
echo   OS: %OS%
echo.

echo Configuration Options:
echo   1) Docker Compose (recommended - requires Docker Desktop)
echo   2) Manual Windows Setup (local Apache, Python, MongoDB)
echo.

set /p CHOICE="Enter choice (1-2): "

if "%CHOICE%"=="1" (
    echo.
    echo Docker Compose Mode
    echo ===================
    echo.
    echo The application will be accessible as:
    echo   - http://%HOSTNAME%
    echo   - http://127.0.0.1
    echo.
    echo Configuration: Using internal Docker DNS 'backend' for reverse proxy
    echo Frontend will access API via Apache reverse proxy
    echo.
    echo To deploy:
    echo   1. Build frontend: cd frontend ^&^& npm install ^&^& npm run build ^&^& cd ..
    echo   2. Start services: docker-compose up --build
    echo.
    echo The application will be accessible at:
    echo   http://%HOSTNAME% (network access)
    echo   http://127.0.0.1 (localhost)
    echo.
    pause
) else if "%CHOICE%"=="2" (
    echo.
    echo Manual Windows Setup
    echo ===================
    echo.
    echo System: %HOSTNAME%
    echo.
    echo Prerequisites required:
    echo   - Python 3.11 or higher
    echo   - Node.js 18 or higher
    echo   - Apache 2.4 (apachelounge.com)
    echo   - MongoDB 6.0 or higher
    echo.
    echo Configuration Steps:
    echo.
    echo 1. BUILD FRONTEND:
    echo    cd frontend
    echo    npm install
    echo    npm run build
    echo    cd ..
    echo.
    echo 2. SETUP BACKEND:
    echo    cd backend
    echo    python -m venv venv
    echo    venv\Scripts\activate
    echo    pip install -r requirements.txt
    echo.
    echo 3. CONFIGURE APACHE:
    echo    - Edit carlogic.conf
    echo    - Change DocumentRoot to absolute path: C:\Users\DELL\Downloads\CarLogic\frontend\build
    echo    - Copy to Apache: C:\Apache24\conf\extra\carlogic.conf
    echo    - Edit C:\Apache24\conf\httpd.conf - ensure:
    echo      LoadModule proxy_module modules/mod_proxy.so
    echo      LoadModule proxy_http_module modules/mod_proxy_http.so
    echo      LoadModule rewrite_module modules/mod_rewrite.so
    echo    - Include carlogic.conf: Include conf/extra/carlogic.conf
    echo.
    echo 4. START SERVICES (in separate terminals):
    echo    Terminal 1 - MongoDB:
    echo      mongod --dbpath "C:\path\to\mongodb\data"
    echo.
    echo    Terminal 2 - Backend:
    echo      cd backend
    echo      venv\Scripts\activate
    echo      python run_server.py
    echo.
    echo    Terminal 3 - Apache:
    echo      cd C:\Apache24\bin
    echo      httpd.exe
    echo.
    echo 5. ACCESS APPLICATION:
    echo    - http://%HOSTNAME%
    echo    - http://127.0.0.1
    echo    - http://localhost
    echo.
    echo Frontend is accessible at: http://%HOSTNAME%
    echo API Documentation: http://%HOSTNAME%:8000/docs
    echo.
    pause
) else (
    echo Invalid choice. Exiting.
    exit /b 1
)

echo.
echo Setup script completed.
pause
