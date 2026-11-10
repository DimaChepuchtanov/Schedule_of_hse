#requires -Version 5.1
<#
.SYNOPSIS
Build and start Schedule HSE; verify PostgreSQL, schema initialization, migrations and HTTP.
.EXAMPLE
.\scripts\start-docker.ps1
.EXAMPLE
.\scripts\start-docker.ps1 -ProjectName schedule-hse-cleancheck -Port 8001
#>
[CmdletBinding()]
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$ComposeFile = 'docker-compose.yml',
    [string]$EnvFile = '.env',
    [string]$ProjectName = '',
    [ValidateRange(0, 65535)][int]$Port = 0,
    [ValidateRange(10, 3600)][int]$TimeoutSeconds = 180,
    [switch]$UseCache
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$script:ComposeArgs = @()
$script:ContextReady = $false

function Invoke-Docker {
    param([string[]]$Arguments, [switch]$Capture, [switch]$AllowFailure)
    $previousPreference = $ErrorActionPreference
    $errorFile = $null
    $output = @()
    $errorText = ''
    try {
        # Windows PowerShell 5.1 does not throw on a native nonzero exit code.
        $ErrorActionPreference = 'Continue'
        if ($Capture) {
            $errorFile = [System.IO.Path]::GetTempFileName()
            $output = @(& $script:DockerCommand @Arguments 2> $errorFile)
            $code = $LASTEXITCODE
            $errorText = [System.IO.File]::ReadAllText($errorFile)
        } else {
            & $script:DockerCommand @Arguments 2>&1 | ForEach-Object { Write-Host "$_" }
            $code = $LASTEXITCODE
        }
    } finally {
        $ErrorActionPreference = $previousPreference
        if ($errorFile -and (Test-Path -LiteralPath $errorFile)) {
            Remove-Item -LiteralPath $errorFile -Force -WhatIf:$false -Confirm:$false
        }
    }
    if ($code -ne 0 -and -not $AllowFailure) {
        throw "Docker failed (exit $code). $errorText"
    }
    if ($Capture) {
        return [pscustomobject]@{ ExitCode = $code; Text = ($output -join "`n"); ErrorText = $errorText }
    }
}

function Get-DockerText {
    param([string[]]$Arguments)
    return (Invoke-Docker -Arguments $Arguments -Capture).Text
}

function Invoke-Compose {
    param([string[]]$Arguments)
    Invoke-Docker -Arguments ($script:ComposeArgs + $Arguments)
}

function Get-ComposeText {
    param([string[]]$Arguments)
    return Get-DockerText -Arguments ($script:ComposeArgs + $Arguments)
}

function Initialize-Project {
    # Docker Desktop may expose both docker.exe and an extensionless docker file.
    # Always select one ApplicationInfo before taking its Source property.
    $dockerApplication = Get-Command -Name 'docker.exe' -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -eq $dockerApplication) {
        $dockerApplication = Get-Command -Name 'docker' -CommandType Application -ErrorAction SilentlyContinue |
            Select-Object -First 1
    }
    if ($null -eq $dockerApplication -or [string]::IsNullOrWhiteSpace($dockerApplication.Source)) {
        throw 'Docker CLI was not found. Install Docker Desktop and check PATH.'
    }
    $script:DockerCommand = [string]$dockerApplication.Source
    $null = Get-DockerText -Arguments @('version', '--format', '{{.Server.Version}}')
    $null = Get-DockerText -Arguments @('compose', 'version')

    $script:RootPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
    $composePath = $ComposeFile
    if (-not [System.IO.Path]::IsPathRooted($composePath)) {
        $composePath = Join-Path $script:RootPath $composePath
    }
    $envPath = $EnvFile
    if (-not [System.IO.Path]::IsPathRooted($envPath)) {
        $envPath = Join-Path $script:RootPath $envPath
    }
    if (-not (Test-Path -LiteralPath $composePath -PathType Leaf)) {
        throw "Compose file not found: $composePath"
    }
    if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
        throw "Environment file not found: $envPath. Create it from the project's example."
    }
    $script:ComposeArgs = @('compose', '--project-directory', $script:RootPath,
        '--file', $composePath, '--env-file', $envPath)
    if ($ProjectName) { $script:ComposeArgs += @('--project-name', $ProjectName) }

    # The resolved config includes passwords. Never print it or write it to disk.
    $json = Get-ComposeText -Arguments @('config', '--format', 'json')
    $script:Config = $json | ConvertFrom-Json
    $script:EffectiveProject = [string]$script:Config.name
    if ($script:EffectiveProject -notmatch '^[a-z0-9][a-z0-9_-]*$') {
        throw 'Could not resolve a valid Compose project name.'
    }
    foreach ($service in @('db', 'db-init', 'web')) {
        if (-not $script:Config.services.PSObject.Properties[$service]) {
            throw "Expected Compose service is missing: $service"
        }
    }
    if (-not $ProjectName) {
        $script:ComposeArgs += @('--project-name', $script:EffectiveProject)
    }
    $script:ContextReady = $true
    Write-Host "Project: $script:EffectiveProject"
    Write-Host "Directory: $script:RootPath"
}

function Show-Diagnostics {
    if (-not $script:ContextReady) { return }
    Write-Host '--- Container status ---'
    $null = Invoke-Docker -Arguments ($script:ComposeArgs + @('ps', '--all')) -AllowFailure
    Write-Host '--- Recent container logs ---'
    $null = Invoke-Docker -Arguments ($script:ComposeArgs +
        @('logs', '--no-color', '--tail', '80', 'db', 'db-init', 'web')) -AllowFailure
}

function Get-ServiceState {
    param([string]$Service)
    $ids = @(Get-ComposeText -Arguments @('ps', '--all', '--quiet', $Service))
    $ids = @($ids -split '\r?\n' | Where-Object { $_ })
    if ($ids.Count -eq 0) { return $null }
    if ($ids.Count -ne 1) { throw "Expected exactly one container for $Service." }
    return Get-DockerText -Arguments @('inspect', '--format', '{{json .State}}', $ids[0]) | ConvertFrom-Json
}

function Test-ServiceStates {
    $ready = $true
    foreach ($service in @('db', 'db-init', 'web')) {
        $state = Get-ServiceState -Service $service
        if ($null -eq $state) { $ready = $false; continue }
        if ($service -eq 'db-init' -and $state.Status -eq 'exited' -and $state.ExitCode -eq 0) {
            continue
        }
        if ($state.Status -in @('exited', 'dead', 'restarting', 'removing')) {
            throw "Service '$service' is $($state.Status), exit code $($state.ExitCode)."
        }
        if ($service -eq 'db-init') { $ready = $false; continue }
        if ($state.Status -ne 'running') { $ready = $false; continue }
        if ($service -eq 'db') {
            if (-not $state.PSObject.Properties['Health']) {
                throw 'PostgreSQL has no healthcheck. Check the Compose file.'
            }
            if ($state.Health.Status -eq 'unhealthy') { throw 'PostgreSQL healthcheck failed.' }
            if ($state.Health.Status -ne 'healthy') { $ready = $false }
        }
    }
    return $ready
}

function Get-Http {
    param([string]$Url)
    # -UseBasicParsing also avoids the Internet Explorer dependency in PS 5.1.
    return Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 0
}

$oldPort = [Environment]::GetEnvironmentVariable('APP_PORT', 'Process')
try {
    if ($Port -ne 0) { $env:APP_PORT = [string]$Port }
    Initialize-Project

    Write-Host 'Pulling PostgreSQL and building the application...'
    Invoke-Compose -Arguments @('pull', 'db', 'db-init')
    $buildArgs = @('build', '--pull')
    if (-not $UseCache) { $buildArgs += '--no-cache' }
    $buildArgs += 'web'
    Invoke-Compose -Arguments $buildArgs
    Invoke-Compose -Arguments @('up', '--detach', '--force-recreate', '--remove-orphans', '--no-build')

    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host "Waiting for containers (up to $TimeoutSeconds seconds)..."
    while (-not (Test-ServiceStates)) {
        if ($timer.Elapsed.TotalSeconds -ge $TimeoutSeconds) { throw 'Container readiness timed out.' }
        Start-Sleep -Seconds 2
    }
    Write-Host '[OK] db: healthy; db-init: exited 0; web: running.'

    $binding = (Get-ComposeText -Arguments @('port', 'web', '8000')).Trim()
    if ($binding -notmatch ':(\d+)\s*$') { throw "Could not determine the web port: $binding" }
    $baseUrl = "http://127.0.0.1:$($Matches[1])"
    $lastHttpError = ''
    while ($true) {
        if (-not (Test-ServiceStates)) { throw 'A container stopped being ready.' }
        try {
            $response = Get-Http -Url "$baseUrl/api/me/"
            if ([int]$response.StatusCode -ne 200) { throw "HTTP $($response.StatusCode)" }
            $me = $response.Content | ConvertFrom-Json
            if (-not $me.PSObject.Properties['authenticated'] -or $me.authenticated -ne $false) {
                throw 'Unexpected /api/me/ response (expected anonymous JSON).'
            }
            break
        } catch {
            $lastHttpError = $_.Exception.Message
            if ($timer.Elapsed.TotalSeconds -ge $TimeoutSeconds) {
                throw "Django HTTP readiness timed out: $lastHttpError. Check DJANGO_ALLOWED_HOSTS for 127.0.0.1."
            }
            Start-Sleep -Seconds 2
        }
    }
    Write-Host '[OK] Django /api/me/ responds with the expected JSON.'

    Invoke-Compose -Arguments @('exec', '-T', 'web', 'python', 'manage.py', 'check', '--database', 'default')
    Invoke-Compose -Arguments @('exec', '-T', 'web', 'python', 'manage.py', 'migrate', '--check', '--noinput')
    Invoke-Compose -Arguments @('exec', '-T', 'web', 'python', 'manage.py', 'showmigrations')
    Write-Host '[OK] Django checks passed; no pending migrations.'

    # migrate --check cannot detect an old physical NOT NULL constraint.
    # This SELECT catches an old database created with the previous initial migration.
    $pgUser = [string]$script:Config.services.db.environment.POSTGRES_USER
    $pgDatabase = [string]$script:Config.services.db.environment.POSTGRES_DB
    $sql = "SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'identity' AND table_name = 'user' AND column_name = 'last_login';"
    $nullable = Get-ComposeText -Arguments @('exec', '-T', 'db', 'psql', '-U', $pgUser, '-d', $pgDatabase,
        '-v', 'ON_ERROR_STOP=1', '-At', '-c', $sql)
    if ($nullable.Trim() -ne 'YES') {
        throw 'identity.user.last_login is missing or NOT NULL. An old database needs a proper migration, or a reset if its data can be discarded.'
    }
    Write-Host '[OK] PostgreSQL: identity.user.last_login is nullable.'

    $csrf = (Get-Http -Url "$baseUrl/api/csrf/").Content | ConvertFrom-Json
    if (-not $csrf.PSObject.Properties['csrfToken'] -or -not $csrf.csrfToken) {
        throw 'The CSRF endpoint did not return csrfToken.'
    }
    $page = Get-Http -Url "$baseUrl/auth/"
    $rootPattern = @'
id\s*=\s*["']root["']
'@
    if ($page.Content -notmatch $rootPattern) { throw 'The React page did not contain its root element.' }
    $assetPattern = @'
(?:src|href)=["'](?<asset>/static/[^"']+\.(?:js|css))["']
'@
    $assetMatches = [regex]::Matches([string]$page.Content, $assetPattern.Trim())
    if ($assetMatches.Count -eq 0) { throw 'No built React assets found in /auth/. Check the Vite base path and collectstatic.' }
    foreach ($asset in $assetMatches) {
        $assetResponse = Get-Http -Url ($baseUrl + $asset.Groups['asset'].Value)
        if ([int]$assetResponse.StatusCode -ne 200) { throw 'A React static asset did not return HTTP 200.' }
        if ([string]$assetResponse.Headers['Content-Type'] -match 'text/html') {
            throw 'A React static asset returned HTML instead of JS/CSS.'
        }
    }
    if (-not (Test-ServiceStates)) { throw 'A container stopped being ready after the checks.' }
    Write-Host '[OK] CSRF, React page and referenced JS/CSS are available.'
    Invoke-Compose -Arguments @('ps', '--all')
    Write-Host "Ready: $baseUrl/auth/" -ForegroundColor Green
    Write-Host 'This is a startup smoke check; it does not test user login or all UI actions.'
    exit 0
} catch {
    Write-Error $_.Exception.Message -ErrorAction Continue
    Show-Diagnostics
    Write-Host 'Containers were left in place for investigation. Fix the error and rerun start-docker.ps1.'
    exit 1
} finally {
    [Environment]::SetEnvironmentVariable('APP_PORT', $oldPort, 'Process')
}
