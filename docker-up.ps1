# docker-up.ps1
# Script para inicializar Docker no Windows (PowerShell)

Write-Host "=================================================="
Write-Host "🐳 Substrato - Docker Setup"
Write-Host "=================================================="

# Detectar docker compose
$compose = $null
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        docker compose version | Out-Null
        $compose = "docker compose"
    } catch {
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            $compose = "docker-compose"
        } else {
            Write-Host "✗ Docker Compose não encontrado" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "✗ Docker não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Verificando Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
} catch {
    Write-Host "✗ Docker daemon não está rodando" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker OK" -ForegroundColor Green

# Criar .env
if (-not (Test-Path ".env")) {
    Write-Host "✓ Criando arquivo .env..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env"
    Write-Host "✓ .env criado" -ForegroundColor Green
} else {
    Write-Host ".env já existe" -ForegroundColor Yellow
}

$env:DOCKER_BUILDKIT = 1
$env:COMPOSE_DOCKER_CLI_BUILD = 1

Write-Host "✓ Iniciando serviços (com build)..." -ForegroundColor Yellow
Invoke-Expression "$compose up --build -d"

Write-Host "✓ Aguardando containers..." -ForegroundColor Yellow
$services = @("db", "redis", "backend", "frontend")
foreach ($service in $services) {
    Write-Host "Service: $service"
}

Write-Host "✓ Status dos containers:" -ForegroundColor Yellow
Invoke-Expression "$compose ps"

Write-Host "==================================================" -ForegroundColor Green
Write-Host "✅ Substrato iniciado!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host "URLs:"
