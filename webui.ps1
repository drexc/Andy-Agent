# ==============================================================================
# Andy Agent WebUI - Script de Inicio Rápido (PowerShell)
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  🚀 Iniciando Andy Agent WebUI (RLM & Graft Studio)    " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$Port = if ($args.Length -gt 0) { $args[0] } else { 3000 }

# Lanzar servidor WebUI
npx tsx packages/webui/src/server/cli.ts --port $Port
