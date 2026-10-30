#Requires -Version 5.1
<#
.SYNOPSIS
    Prepara o repositório MOTO-TAXI RAPIDINHO em uma pasta local do Windows.

.DESCRIPTION
    Copia o conteúdo deste repositório para o destino informado (por padrão
    H:\MOTO-TAXI-RAPIDINHO), inicializa o git e faz o commit inicial.

.PARAMETER Destination
    Pasta de destino. Padrão: H:\MOTO-TAXI-RAPIDINHO

.PARAMETER Source
    Pasta de origem. Padrão: a pasta-pai deste script.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -Destination "D:\Projetos\MOTO-TAXI-RAPIDINHO"
#>
[CmdletBinding()]
param(
    [string]$Destination = "H:\MOTO-TAXI-RAPIDINHO",
    [string]$Source = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

Write-Step "Origem : $Source"
Write-Step "Destino: $Destination"

if (-not (Test-Path $Source)) {
    throw "Pasta de origem não encontrada: $Source"
}

# Garante a existência da unidade (ex.: H:) antes de criar a pasta.
$drive = Split-Path -Qualifier $Destination
if ($drive -and -not (Test-Path "$drive\")) {
    throw "A unidade $drive não existe nesta máquina. Ajuste o parâmetro -Destination."
}

if (-not (Test-Path $Destination)) {
    Write-Step "Criando pasta de destino"
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

Write-Step "Copiando arquivos"
$exclude = @('.git', 'node_modules', 'backend\data')
Get-ChildItem -Path $Source -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $Destination -Recurse -Force
}

Set-Location $Destination

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Warning "git não encontrado no PATH. Instale o Git para usar controle de versão."
} else {
    if (-not (Test-Path (Join-Path $Destination ".git"))) {
        Write-Step "Inicializando repositório git"
        git init -b main | Out-Null
    }
    git add -A
    if (git status --porcelain) {
        Write-Step "Criando commit inicial"
        git -c user.name="openhands" -c user.email="openhands@all-hands.dev" `
            commit -m "chore: prepara repositorio MOTO-TAXI-RAPIDINHO" | Out-Null
    } else {
        Write-Step "Nada novo para versionar"
    }
}

Write-Step "Concluído! Repositório pronto em: $Destination"
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  cd `"$Destination\backend`""
Write-Host "  npm install"
Write-Host "  npm test"
Write-Host "  npm start"
Write-Host ""
Write-Host "Painel administrativo (DASHBOARD):" -ForegroundColor Yellow
Write-Host "  # crie o primeiro admin (uma vez):"
Write-Host "  node scripts/create-admin.js --email admin@exemplo.com --password `"senha-forte`""
Write-Host "  # abra http://localhost:3000/dashboard"
