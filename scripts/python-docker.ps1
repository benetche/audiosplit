$ErrorActionPreference = 'Stop'

$Container       = if ($env:AUDIOSPLIT_CONTAINER)        { $env:AUDIOSPLIT_CONTAINER }        else { 'audiosplit-engine' }
$DockerProfile   = if ($env:AUDIOSPLIT_DOCKER_PROFILE)   { $env:AUDIOSPLIT_DOCKER_PROFILE }   else { 'cpu' }
$ServiceName     = "engine-$DockerProfile"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\','/')
$UserHome    = if ($env:USERPROFILE) { $env:USERPROFILE.TrimEnd('\','/') } elseif ($env:HOME) { $env:HOME.TrimEnd('\','/') } else { '' }

$running = $false
try {
    $names = & docker ps --format '{{.Names}}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $names) {
        $running = ($names -split "`r?`n") -contains $Container
    }
} catch {
    [Console]::Error.WriteLine("[python-docker] docker ps failed: $_")
    exit 127
}

if (-not $running) {
    [Console]::Error.WriteLine("[python-docker] starting container '$Container' via service '$ServiceName' (profile '$DockerProfile')...")
    Push-Location $ProjectRoot
    try {
        & docker compose --profile $DockerProfile up -d $ServiceName 2>&1 | ForEach-Object { [Console]::Error.WriteLine($_) }
        if ($LASTEXITCODE -ne 0) {
            [Console]::Error.WriteLine("[python-docker] docker compose up failed with exit code $LASTEXITCODE")
            exit $LASTEXITCODE
        }
    } finally {
        Pop-Location
    }
}

function Convert-HostPath {
    param([string]$Arg, [string]$Prefix, [string]$Mount)
    if (-not $Prefix) { return $null }
    if ($Arg.Length -lt $Prefix.Length) { return $null }
    if (-not $Arg.Substring(0, $Prefix.Length).Equals($Prefix, [StringComparison]::OrdinalIgnoreCase)) { return $null }
    $rest = $Arg.Substring($Prefix.Length).Replace('\','/')
    if ($rest.Length -eq 0) { $rest = '/' }
    elseif (-not $rest.StartsWith('/')) { $rest = '/' + $rest }
    return "$Mount$rest"
}

$translated = @()
foreach ($arg in $args) {
    if ($arg -is [string]) {
        # Project root has priority over user home (project may live inside home).
        $mapped = Convert-HostPath -Arg $arg -Prefix $ProjectRoot -Mount '/app'
        if (-not $mapped) {
            $mapped = Convert-HostPath -Arg $arg -Prefix $UserHome -Mount '/host/home'
        }
        if ($mapped) { $translated += $mapped } else { $translated += $arg }
    } else {
        $translated += $arg
    }
}

& docker exec -i $Container python @translated
exit $LASTEXITCODE
