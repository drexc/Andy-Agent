# Andy Agent Launcher Script for PowerShell
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando Andy Agent WebUI & OpenAI Bridge..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

npx tsx packages/webui/src/server/cli.ts $args
