#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${AUDIOSPLIT_CONTAINER:-audiosplit-engine}"
DOCKER_PROFILE="${AUDIOSPLIT_DOCKER_PROFILE:-cpu}"
SERVICE="engine-${DOCKER_PROFILE}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"
PROJECT_ROOT="${PROJECT_ROOT%/}"
USER_HOME="${USERPROFILE:-${HOME:-}}"
USER_HOME="${USER_HOME%/}"

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "${CONTAINER}"; then
  echo "[python-docker] starting container '${CONTAINER}' via service '${SERVICE}' (profile '${DOCKER_PROFILE}')..." >&2
  ( cd "${PROJECT_ROOT}" && docker compose --profile "${DOCKER_PROFILE}" up -d "${SERVICE}" >&2 )
fi

translate_path() {
  local arg="$1" prefix="$2" mount="$3" rest
  [[ -z "$prefix" ]] && return 1
  case "${arg}" in
    "${prefix}"|"${prefix}/"*|"${prefix}\\"*)
      rest="${arg#${prefix}}"
      rest="${rest//\\//}"
      [[ -z "${rest}" ]] && rest="/"
      [[ "${rest}" != /* ]] && rest="/${rest}"
      printf '%s%s' "$mount" "$rest"
      return 0
      ;;
  esac
  return 1
}

translated=()
for arg in "$@"; do
  # Project root has priority over user home (project may live inside home).
  if mapped="$(translate_path "${arg}" "${PROJECT_ROOT}" "/app")"; then
    translated+=("${mapped}")
  elif mapped="$(translate_path "${arg}" "${USER_HOME}" "/host/home")"; then
    translated+=("${mapped}")
  else
    translated+=("${arg}")
  fi
done

exec docker exec -i "${CONTAINER}" python "${translated[@]}"
