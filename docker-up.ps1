# docker-up.ps1
# Script para inicializar Docker no Windows (PowerShell)

Write-Host "=================================================="
Write-Host "🐳 Substrato - Docker Setup"
Write-Host "=================================================="

# Detectar docker compose
$composeExe = $null
$composeBaseArgs = @()
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Docker não encontrado" -ForegroundColor Red
    exit 1
}
try {
    docker compose version | Out-Null
    $composeExe = "docker"
    $composeBaseArgs = @("compose")
} catch {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $composeExe = "docker-compose"
        $composeBaseArgs = @()
    } else {
        Write-Host "✗ Docker Compose não encontrado" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Verificando Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
} catch {
    Write-Host "✗ Docker daemon não está rodando" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker OK" -ForegroundColor Green

# Forçar o contexto padrão do Docker Desktop (evita confusão com DOCKER_HOST/contextos antigos).
try {
    docker context use desktop-linux | Out-Null
} catch {
    # se falhar, seguimos; o `docker info` acima já validou conectividade.
}

# Criar .env
if (-not (Test-Path ".env")) {
    Write-Host "✓ Criando arquivo .env..." -ForegroundColor Yellow
    $envTemplate = if (Test-Path ".env.docker") { ".env.docker" } else { ".env.docker.example" }
    Copy-Item $envTemplate ".env"
    Write-Host "✓ .env criado" -ForegroundColor Green
} else {
    Write-Host ".env já existe" -ForegroundColor Yellow
}

$env:DOCKER_BUILDKIT = 1
$env:COMPOSE_DOCKER_CLI_BUILD = 1
# Em Windows, reduzir paralelismo ajuda a evitar falhas intermitentes no pipe do Docker Desktop.
$env:COMPOSE_PARALLEL_LIMIT = 1

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args,
        [int]$Retries = 3,
        [int]$RetryDelaySeconds = 4
    )

    for ($attempt = 1; $attempt -le $Retries; $attempt++) {
        $outputLines = @()
        try {
            $outputLines = & $composeExe @composeBaseArgs @Args 2>&1
            $exitCode = $LASTEXITCODE
        } catch {
            $outputLines = @($_.Exception.Message)
            $exitCode = 1
        }

        if ($outputLines) {
            $outputLines | ForEach-Object { Write-Host $_ }
        }

        if ($exitCode -eq 0) {
            return
        }

        $joined = ($outputLines -join "`n")
        $isDockerDesktopPipeEof = ($joined -match "dockerDesktopLinuxEngine") -and ($joined -match "\bEOF\b")

        if ($isDockerDesktopPipeEof -and $attempt -lt $Retries) {
            Write-Host "⚠ Docker Desktop desconectou (EOF). Tentando novamente em ${RetryDelaySeconds}s... ($attempt/$Retries)" -ForegroundColor Yellow
            Start-Sleep -Seconds $RetryDelaySeconds
            continue
        }

        throw "Falha ao executar: $composeExe $($composeBaseArgs -join ' ') $($Args -join ' ')"
    }
}

function Wait-ContainerHealthy {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ContainerName,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $status = docker inspect -f "{{.State.Health.Status}}" $ContainerName 2>$null
            if ($status -eq "healthy") { return }
        } catch {
            # container pode ainda não existir
        }
        Start-Sleep -Seconds 2
    }

    throw "Timeout aguardando healthcheck: $ContainerName"
}

Write-Host "✓ Subindo DB e Redis primeiro..." -ForegroundColor Yellow
Invoke-Compose -Args @("up", "-d", "db", "redis") -Retries 5 -RetryDelaySeconds 4
Wait-ContainerHealthy -ContainerName "substrato_db" -TimeoutSeconds 180
Wait-ContainerHealthy -ContainerName "substrato_redis" -TimeoutSeconds 120

Write-Host "✓ Build do backend..." -ForegroundColor Yellow
Invoke-Compose -Args @("build", "backend") -Retries 3 -RetryDelaySeconds 4

Write-Host "✓ Subindo backend..." -ForegroundColor Yellow
Invoke-Compose -Args @("up", "-d", "backend") -Retries 5 -RetryDelaySeconds 4

Write-Host "✓ Subindo demais serviços..." -ForegroundColor Yellow
Invoke-Compose -Args @("up", "-d") -Retries 3 -RetryDelaySeconds 4

Write-Host "✓ Warmup do frontend (Next.js)..." -ForegroundColor Yellow
try {
    Invoke-Compose -Args @("run", "--rm", "warmup") -Retries 2 -RetryDelaySeconds 2
} catch {
    Write-Host "⚠ Warmup falhou (ignorando): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "✓ Aguardando containers..." -ForegroundColor Yellow
$services = @("db", "redis", "backend", "frontend")
foreach ($service in $services) {
    Write-Host "Service: $service"
}

Write-Host "✓ Status dos containers:" -ForegroundColor Yellow
Invoke-Compose -Args @("ps") -Retries 2 -RetryDelaySeconds 2

Write-Host "==================================================" -ForegroundColor Green
Write-Host "✅ Substrato iniciado!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host "URLs:"
