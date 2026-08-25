@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo 🚀 Iniciando Andy Agent WebUI ^& OpenAI Bridge...
echo ========================================================
npx tsx packages/webui/src/server/cli.ts %*
