#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export PYTHON_EXECUTABLE="${SCRIPT_DIR}/scripts/python-docker.sh"

if [[ ! -f "${PYTHON_EXECUTABLE}" ]]; then
  echo "[dev-docker] Wrapper nao encontrado em ${PYTHON_EXECUTABLE}. Confirme que scripts/python-docker.sh existe." >&2
  exit 1
fi

echo "[dev-docker] PYTHON_EXECUTABLE = ${PYTHON_EXECUTABLE}"
if [[ -n "${AUDIOSPLIT_DOCKER_PROFILE:-}" ]]; then
  echo "[dev-docker] AUDIOSPLIT_DOCKER_PROFILE = ${AUDIOSPLIT_DOCKER_PROFILE}"
fi

exec npm run dev
