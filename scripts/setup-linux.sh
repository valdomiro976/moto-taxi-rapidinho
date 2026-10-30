#!/usr/bin/env bash
# Prepara o ambiente do backend MOTO-TAXI RAPIDINHO em Linux/macOS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

echo "==> Instalando dependências"
npm install

echo "==> Rodando testes"
npm test

echo ""
echo "Pronto. Para subir a API:"
echo "  cd \"$ROOT/backend\" && npm start"
