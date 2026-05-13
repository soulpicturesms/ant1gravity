@echo off
title ANT1GRAVITY Guild Portal
echo.
echo  ============================================
echo    ANT1GRAVITY - ALBION ONLINE GUILD PORTAL
echo  ============================================
echo.

echo  [0/2] Cerrando procesos previos de Node.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo  [1/2] Construyendo frontend...
cd /d %~dp0frontend
call npm run build
if errorlevel 1 (
  echo  ERROR: Fallo el build del frontend
  pause
  exit /b 1
)

echo.
echo  [2/2] Iniciando servidor...
echo.
echo  Abre tu navegador en: http://localhost:3000
echo  Admin: admin / admin123
echo.
echo  Presiona Ctrl+C para detener
echo.

cd /d %~dp0
node backend/server.js
pause
