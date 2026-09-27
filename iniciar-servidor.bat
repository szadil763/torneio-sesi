@echo off
chcp 65001 > nul
title Torneio SESI — Servidor Offline

echo.
echo  ┌──────────────────────────────────────────────────┐
echo  │  TORNEIO SESI — Servidor Local (Modo Offline)    │
echo  └──────────────────────────────────────────────────┘
echo.

echo  [1/4] Verificando Node.js...
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
for /f "tokens=*" %%v in ('node --version') do echo  Node.js %%v OK

echo.
echo  [2/4] Verificando dependencias...
if not exist node_modules (
  echo  Instalando dependencias (pode demorar 1-2 min)...
  npm install --silent
  if errorlevel 1 (
    echo  ERRO ao instalar dependencias. Verifique sua conexao.
    pause
    exit /b 1
  )
)
if not exist node_modules\qrcode (
  echo  Instalando qrcode ^(QR codes^)...
  npm install qrcode --save-optional --silent
)
echo  Dependencias OK.

echo.
echo  [3/4] Compilando gerenciador de provas...
if not exist dist\index.html (
  echo  Executando npm run build...
  npm run build:offline
  if errorlevel 1 (
    echo  ERRO na compilacao. Verifique os arquivos do projeto.
    pause
    exit /b 1
  )
  echo  Build OK.
) else (
  echo  Build ja existe ^(dist\index.html^). Pulando recompilacao.
  echo  Dica: delete a pasta dist\ para forcar novo build.
)

echo.
echo  [4/4] Iniciando servidor offline...
echo.
echo  ┌──────────────────────────────────────────────────┐
echo  │  Acesse no navegador deste notebook:             │
echo  │                                                  │
echo  │  Gerenciador:  http://localhost:3000/gerenciador │
echo  │  Monitor:      http://localhost:3000/monitor     │
echo  │  Setup QR:     http://localhost:3000/            │
echo  │                                                  │
echo  │  Pressione Ctrl+C para encerrar.                 │
echo  └──────────────────────────────────────────────────┘
echo.

node servidor.cjs

pause
