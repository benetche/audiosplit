$ErrorActionPreference = 'Stop'

$env:PYTHON_EXECUTABLE = Join-Path $PSScriptRoot 'scripts\python-docker.cmd'

if (-not (Test-Path $env:PYTHON_EXECUTABLE)) {
    Write-Error "Wrapper nao encontrado em $($env:PYTHON_EXECUTABLE). Confirme que scripts/python-docker.cmd existe."
    exit 1
}

Write-Host "[dev-docker] PYTHON_EXECUTABLE = $env:PYTHON_EXECUTABLE"
if ($env:AUDIOSPLIT_DOCKER_PROFILE) {
    Write-Host "[dev-docker] AUDIOSPLIT_DOCKER_PROFILE = $env:AUDIOSPLIT_DOCKER_PROFILE"
}

& npm run dev
exit $LASTEXITCODE
