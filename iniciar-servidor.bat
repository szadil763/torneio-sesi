@echo off
chcp 65001 > nul
title Servidor Kahoot Local — SESI

echo.
echo  Verificando Node.js...
node --version > nul 2>&1
if errorlevel 1 (
  echo.
  echo  ERRO: Node.js nao encontrado.
  echo  Baixe e instale em: https://nodejs.org
  echo  Escolha a versao LTS e instale normalmente.
  echo.
  pause
  exit /b 1
)

echo  Node.js OK. Verificando dependencias...
if not exist node_modules\qrcode (
  echo  Instalando qrcode ^(geracao de QR codes^)...
  npm install qrcode --save-optional --silent
)

echo.
echo  Iniciando servidor Kahoot Local...
echo  Abra o monitor em: http://localhost:3000/monitor
echo  Pressione Ctrl+C para encerrar.
echo.

node servidor.js

pause
