@echo off
REM ==============================================================================
REM Andy Agent WebUI - Script de Inicio Rápido (Windows CMD)
REM ==============================================================================
echo.
echo ========================================================
echo   🚀 Iniciando Andy Agent WebUI (RLM & Graft Studio)
echo ========================================================
echo.

set PORT=%1
if "%PORT%"=="" set PORT=3000

npx tsx packages/webui/src/server/cli.ts --port %PORT%
