param(
    [int]$Port = 3000,
    [string]$Model = "auto/best-coding",
    [string]$Provider = "omniroute",
    [switch]$Verbose
)

$argsList = @("packages/openai-bridge/src/cli.ts", "--port", $Port, "--model", $Model, "--provider", $Provider)
if ($Verbose) { $argsList += "--verbose" }

Write-Host "Iniciando Andy Agent OpenAI Bridge en el puerto $Port..." -ForegroundColor Cyan
npx tsx @argsList
