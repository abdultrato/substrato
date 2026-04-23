# docker-down.ps1
# Script para encerrar Docker no Windows (PowerShell)

Write-Host "=================================================="
Write-Host "Substrato - Docker Teardown"
Write-Host "=================================================="

function Show-Help {
    @"
Uso: ./docker-down.ps1 [opcoes]

Opcoes:
  -v, --volumes            remove volumes do projeto
  --rmi local|all          remove imagens locais (local) ou todas (all)
  --remove-orphans         remove containers orfaos (padrao)
  --no-remove-orphans      nao remove containers orfaos
  --timeout <segundos>     timeout para stop gracioso (padrao: 30)
  -h, --help               mostra esta ajuda

Variaveis de ambiente:
  DOCKER_DOWN_REMOVE_VOLUMES=0|1      (padrao: 0)
  DOCKER_DOWN_REMOVE_ORPHANS=0|1      (padrao: 1)
  DOCKER_DOWN_RMI=none|local|all      (padrao: none)
  DOCKER_DOWN_TIMEOUT=<segundos>      (padrao: 30)
"@ | Write-Host
}

function Parse-BoolEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [bool]$DefaultValue
    )

    $raw = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $DefaultValue
    }

    switch ($raw.ToLowerInvariant()) {
        "1" { return $true }
        "true" { return $true }
        "yes" { return $true }
        "0" { return $false }
        "false" { return $false }
        "no" { return $false }
        default {
            throw "$Name invalido: $raw (use 0|1, true|false, yes|no)"
        }
    }
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args,
        [int]$Retries = 3,
        [int]$RetryDelaySeconds = 3
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
            Write-Host "Docker Desktop desconectou (EOF). Tentando novamente em ${RetryDelaySeconds}s... ($attempt/$Retries)" -ForegroundColor Yellow
            Start-Sleep -Seconds $RetryDelaySeconds
            continue
        }

        throw "Falha ao executar: $composeExe $($composeBaseArgs -join ' ') $($Args -join ' ')"
    }
}

try {
    $removeVolumes = Parse-BoolEnv -Name "DOCKER_DOWN_REMOVE_VOLUMES" -DefaultValue $false
    $removeOrphans = Parse-BoolEnv -Name "DOCKER_DOWN_REMOVE_ORPHANS" -DefaultValue $true
} catch {
    Write-Host "✗ $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$rmiMode = if ($env:DOCKER_DOWN_RMI) { $env:DOCKER_DOWN_RMI.ToLowerInvariant() } else { "none" }
$timeoutRaw = if ($env:DOCKER_DOWN_TIMEOUT) { $env:DOCKER_DOWN_TIMEOUT } else { "30" }

$index = 0
while ($index -lt $args.Count) {
    $arg = [string]$args[$index]

    switch -Regex ($arg) {
        "^-h$|^--help$" {
            Show-Help
            exit 0
        }
        "^-v$|^--volumes$" {
            $removeVolumes = $true
            $index++
            continue
        }
        "^--remove-orphans$" {
            $removeOrphans = $true
            $index++
            continue
        }
        "^--no-remove-orphans$" {
            $removeOrphans = $false
            $index++
            continue
        }
        "^--rmi=(.+)$" {
            $rmiMode = $Matches[1].ToLowerInvariant()
            $index++
            continue
        }
        "^--timeout=(.+)$" {
            $timeoutRaw = $Matches[1]
            $index++
            continue
        }
        "^--rmi$" {
            if (($index + 1) -ge $args.Count) {
                Write-Host "✗ --rmi requer valor: local|all" -ForegroundColor Red
                exit 1
            }
            $rmiMode = [string]$args[$index + 1]
            $index += 2
            continue
        }
        "^--timeout$" {
            if (($index + 1) -ge $args.Count) {
                Write-Host "✗ --timeout requer um valor numerico" -ForegroundColor Red
                exit 1
            }
            $timeoutRaw = [string]$args[$index + 1]
            $index += 2
            continue
        }
        default {
            Write-Host "✗ Opcao invalida: $arg" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
}

$rmiMode = $rmiMode.ToLowerInvariant()
if ($rmiMode -notin @("none", "local", "all")) {
    Write-Host "✗ DOCKER_DOWN_RMI invalido: $rmiMode (use none|local|all)" -ForegroundColor Red
    exit 1
}

if ($timeoutRaw -notmatch "^[0-9]+$" -or [int]$timeoutRaw -lt 1) {
    Write-Host "✗ DOCKER_DOWN_TIMEOUT invalido: $timeoutRaw" -ForegroundColor Red
    exit 1
}
$timeoutSeconds = [int]$timeoutRaw

# Detectar docker compose
$composeExe = $null
$composeBaseArgs = @()
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Docker nao encontrado" -ForegroundColor Red
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
        Write-Host "✗ Docker Compose nao encontrado" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Verificando Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
} catch {
    Write-Host "✗ Docker daemon nao esta rodando" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker OK" -ForegroundColor Green

# Forcar o contexto padrao do Docker Desktop (evita confusao com contextos antigos).
try {
    docker context use desktop-linux | Out-Null
} catch {
    # Se falhar, seguimos; docker info acima ja validou conectividade.
}

$downArgs = @("down", "--timeout", $timeoutSeconds.ToString())
if ($removeVolumes) {
    $downArgs += "-v"
}
if ($removeOrphans) {
    $downArgs += "--remove-orphans"
}
if ($rmiMode -ne "none") {
    $downArgs += @("--rmi", $rmiMode)
}

Write-Host "✓ Encerrando stack..." -ForegroundColor Yellow
Invoke-Compose -Args $downArgs -Retries 3 -RetryDelaySeconds 3

Write-Host "✓ Status dos containers:" -ForegroundColor Yellow
try {
    Invoke-Compose -Args @("ps") -Retries 2 -RetryDelaySeconds 2
} catch {
    Write-Host "Nao foi possivel mostrar status apos down." -ForegroundColor Yellow
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host "Substrato encerrado." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos uteis:"
Write-Host "  Iniciar stack:  ./docker-up.ps1"
Write-Host "  Ver logs:       docker compose logs -f"
