#!/usr/bin/env bash
# Ativa o Python virtualenv na raiz do projeto (.venv).
# Uso (no shell atual):  source scripts/activate-venv.sh
# Não use ./scripts/activate-venv.sh — o ambiente só vale no processo que fez source.

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Execute com: source scripts/activate-venv.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ACTIVATE="$ROOT/.venv/bin/activate"

if [[ ! -f "$ACTIVATE" ]]; then
  echo "Ambiente não encontrado: $ACTIVATE" >&2
  echo "Crie com: python3 -m venv .venv && .venv/bin/pip install -r engine/requirements.txt" >&2
  return 1
fi

# shellcheck source=/dev/null
source "$ACTIVATE"
