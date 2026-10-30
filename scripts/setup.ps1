#Requires -Version 5.1
<#
.SYNOPSIS
    Instala o MOTO-TAXI RAPIDINHO no Windows: clona, instala dependencias,
    roda os testes e cria o administrador do DASHBOARD.

.DESCRIPTION
    Feito para rodar de qualquer lugar (inclusive H:\). Cuida de cada passo e
    para com uma mensagem clara se algo falhar, em vez de deixar erros soltos.

.PARAMETER Destination
    Pasta do projeto. Padrao: H:\MOTO-TAXI-RAPIDINHO

.PARAMETER Repo
    URL do repositorio.

.PARAMETER Branch
    Branch a usar. Padrao: main

.PARAMETER AdminEmail
    E-mail do administrador. Padrao: admin@exemplo.com

.PARAMETER AdminPassword
    Senha do administrador (minimo 8 caracteres).

.PARAMETER SkipTests
    Pula a execucao dos testes.

.PARAMETER Force
    Se a pasta de destino existir com arquivos mas sem .git (copia incompleta),
    apaga o conteudo dela e clona de novo. Sem esta opcao o script apenas recusa.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\setup.ps1
    powershell -ExecutionPolicy Bypass -File .\setup.ps1 -AdminEmail eu@exemplo.com -AdminPassword "minha-senha-forte"
    powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Force
#>
[CmdletBinding()]
param(
    [string]$Destination = "H:\MOTO-TAXI-RAPIDINHO",
    [string]$Repo = "https://github.com/valdomiro976/moto-taxi-rapidinho.git",
    [string]$Branch = "main",
    [string]$AdminEmail = "admin@exemplo.com",
    [string]$AdminPassword = "senha-forte",
    [switch]$SkipTests,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "    OK  $m" -ForegroundColor Green }
function Fail($m) { Write-Host "    ERRO $m" -ForegroundColor Red }

function Need($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Fail "'$name' nao encontrado no PATH. $hint"
        exit 1
    }
}

# --- Checagens de ambiente ---
Step "Verificando o ambiente"
Need "git"  "Instale o Git: https://git-scm.com/download/win"
Need "node" "Instale o Node.js 22 ou superior: https://nodejs.org"
Need "npm"  "O npm vem junto com o Node.js."

$nodeVersion = (& node --version).TrimStart("v")
$nodeMajor = [int]($nodeVersion -split "\.")[0]
if ($nodeMajor -lt 22) {
    Fail "Node.js $nodeVersion e antigo. O projeto usa o modulo nativo node:sqlite (Node >= 22)."
    exit 1
}
Ok "git, node $nodeVersion e npm disponiveis"

# A unidade (ex.: H:) precisa existir antes de qualquer coisa.
# -Qualifier so existe em caminhos com letra de unidade (Windows), entao so
# checamos quando ha uma.
$drive = $null
try { $drive = Split-Path -Qualifier $Destination -ErrorAction Stop } catch { $drive = $null }
if ($drive -and $drive -match "^[A-Za-z]:$" -and -not (Test-Path "$drive\")) {
    Fail "A unidade $drive nao existe nesta maquina."
    Write-Host "    Use -Destination para escolher outra pasta, por exemplo:" -ForegroundColor Yellow
    Write-Host "    .\setup.ps1 -Destination `"$env:USERPROFILE\MOTO-TAXI-RAPIDINHO`"" -ForegroundColor Yellow
    exit 1
}

# --- Clonar ---
Step "Preparando a pasta $Destination"
if (Test-Path (Join-Path $Destination ".git")) {
    Ok "Repositorio ja existe; atualizando"
    Push-Location $Destination
    git fetch origin
    if ($LASTEXITCODE -ne 0) { Fail "git fetch falhou."; Pop-Location; exit 1 }
    git checkout $Branch
    if ($LASTEXITCODE -ne 0) { Fail "git checkout $Branch falhou."; Pop-Location; exit 1 }
    git pull --ff-only origin $Branch
    if ($LASTEXITCODE -ne 0) { Fail "git pull falhou."; Pop-Location; exit 1 }
    Pop-Location
} else {
    # Pasta pode existir e estar vazia: o clone precisa acontecer DENTRO dela.
    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }
    $items = Get-ChildItem -Path $Destination -Force -ErrorAction SilentlyContinue
    if ($items) {
        if ($Force) {
            Write-Host "    A pasta tem $($items.Count) item(ns) sem .git; limpando (-Force)" -ForegroundColor Yellow
            Get-ChildItem -Path $Destination -Force | Remove-Item -Recurse -Force
        } else {
            Fail "A pasta $Destination nao esta vazia e nao tem .git."
            Write-Host "    Rode de novo com -Force para apagar o conteudo e clonar:" -ForegroundColor Yellow
            Write-Host "    .\setup.ps1 -Force" -ForegroundColor Yellow
            exit 1
        }
    }
    git clone --branch $Branch $Repo $Destination
    if ($LASTEXITCODE -ne 0) { Fail "Falha no git clone."; exit 1 }
    Ok "Clonado no branch $Branch"
}

$projectRoot = $Destination
$backend = Join-Path $projectRoot "backend"

if (-not (Test-Path (Join-Path $backend "package.json"))) {
    Fail "backend\package.json nao encontrado. O clone terminou corretamente?"
    exit 1
}

# --- Dependencias ---
Step "Instalando dependencias (npm install)"
Push-Location $backend
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install falhou."; Pop-Location; exit 1 }
Ok "Dependencias instaladas"

# --- Testes ---
if (-not $SkipTests) {
    Step "Rodando os testes"
    npm test
    if ($LASTEXITCODE -ne 0) { Fail "Os testes falharam."; Pop-Location; exit 1 }
    Ok "Testes passaram"
}

# --- Administrador ---
Step "Criando o administrador do DASHBOARD"
node scripts/create-admin.js --email $AdminEmail --password $AdminPassword --name "Administrador"
if ($LASTEXITCODE -ne 0) { Fail "Nao foi possivel criar o admin."; Pop-Location; exit 1 }
Ok "Admin pronto: $AdminEmail"
Pop-Location

Write-Host ""
Write-Host "Tudo pronto!" -ForegroundColor Green
Write-Host ""
Write-Host "Para subir o servidor:" -ForegroundColor Yellow
Write-Host "  cd `"$backend`""
Write-Host "  npm start"
Write-Host ""
Write-Host "Depois abra:" -ForegroundColor Yellow
Write-Host "  http://localhost:3000             (portal: escolhe o modulo)"
Write-Host "  http://localhost:3000/passageiro  (app do passageiro)"
Write-Host "  http://localhost:3000/motorista   (app do motorista)"
Write-Host "  http://localhost:3000/dashboard   (painel administrativo)"
Write-Host ""
Write-Host "Entre no painel com: $AdminEmail" -ForegroundColor Yellow
