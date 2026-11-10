#requires -Version 5.1
<#
.SYNOPSIS
Delete this Compose project's containers, volumes (including PostgreSQL), networks and unused service images.
.EXAMPLE
.\scripts\reset-docker.ps1
.EXAMPLE
.\scripts\reset-docker.ps1 -ProjectName schedule-hse-cleancheck -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$ComposeFile = 'docker-compose.yml',
    [string]$EnvFile = '.env',
    [string]$ProjectName = ''
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

try {
    Initialize-Project
    Write-Warning "This deletes PostgreSQL data for '$script:EffectiveProject'."
    if (-not $PSCmdlet.ShouldProcess($script:EffectiveProject,
        'Delete project containers, volumes, networks and unused service images')) {
        return
    }

    # Save image references before removing the containers.
    $imageCandidates = @(Get-ComposeText -Arguments @('config', '--images'))
    $containerIds = Get-DockerText -Arguments @('ps', '--all', '--quiet', '--filter',
        "label=com.docker.compose.project=$script:EffectiveProject")
    foreach ($id in @($containerIds -split '\r?\n' | Where-Object { $_ })) {
        $imageCandidates += Get-DockerText -Arguments @('inspect', '--format', '{{.Config.Image}}', $id)
    }
    # Include older project builds, including dangling intermediate final images.
    $imageIds = Get-DockerText -Arguments @('image', 'ls', '--quiet', '--filter',
        "label=com.docker.compose.project=$script:EffectiveProject")
    foreach ($id in @($imageIds -split '\r?\n' | Where-Object { $_ } | Select-Object -Unique)) {
        $details = (Get-DockerText -Arguments @('image', 'inspect', $id) | ConvertFrom-Json)[0]
        if (@($details.RepoTags).Count -gt 0 -and $details.RepoTags) {
            # The same image ID may also have an unrelated custom tag.
            $imageCandidates += @($details.RepoTags | Where-Object {
                $_.StartsWith($script:EffectiveProject + '-') -or
                $_.StartsWith($script:EffectiveProject + '_')
            })
        } else {
            $imageCandidates += [string]$details.Id
        }
    }

    Invoke-Compose -Arguments @('down', '--volumes', '--remove-orphans')

    # Also remove leftovers from services/volumes removed from the Compose file.
    # Docker refuses removal when a volume or network is still in use.
    $externalVolumes = @()
    if ($script:Config.PSObject.Properties['volumes']) {
        foreach ($item in $script:Config.volumes.PSObject.Properties) {
            if ($item.Value.PSObject.Properties['external'] -and $item.Value.external) {
                $externalVolumes += [string]$item.Value.name
            }
        }
    }
    $volumes = Get-DockerText -Arguments @('volume', 'ls', '--quiet', '--filter',
        "label=com.docker.compose.project=$script:EffectiveProject")
    foreach ($volume in @($volumes -split '\r?\n' | Where-Object { $_ })) {
        if ($volume -in $externalVolumes) { continue }
        Invoke-Docker -Arguments @('volume', 'rm', $volume)
    }
    $externalNetworks = @()
    if ($script:Config.PSObject.Properties['networks']) {
        foreach ($item in $script:Config.networks.PSObject.Properties) {
            if ($item.Value.PSObject.Properties['external'] -and $item.Value.external) {
                $externalNetworks += [string]$item.Value.name
            }
        }
    }
    $networks = Get-DockerText -Arguments @('network', 'ls', '--quiet', '--filter',
        "label=com.docker.compose.project=$script:EffectiveProject")
    foreach ($network in @($networks -split '\r?\n' | Where-Object { $_ })) {
        $networkName = Get-DockerText -Arguments @('network', 'inspect', '--format', '{{.Name}}', $network)
        if ($networkName.Trim() -in $externalNetworks) { continue }
        # A shared/external network is intentionally left for its owner.
        $result = Invoke-Docker -Arguments @('network', 'rm', $network) -Capture -AllowFailure
        if ($result.ExitCode -ne 0) { Write-Warning "Network kept (in use): $network" }
    }

    $images = @($imageCandidates -split '\r?\n' | Where-Object { $_ } | Sort-Object -Unique)
    foreach ($image in $images) {
        $result = Invoke-Docker -Arguments @('image', 'inspect', '--format', '{{.Id}}', $image) -Capture -AllowFailure
        if ($result.ExitCode -ne 0) { continue }
        $users = Get-DockerText -Arguments @('ps', '--all', '--quiet', '--filter', "ancestor=$($result.Text.Trim())")
        if ($users.Trim()) {
            Write-Warning "Image kept: $image (used by another container)."
            continue
        }
        # Never use --force: another tag/project may still need this image.
        $removed = Invoke-Docker -Arguments @('image', 'rm', $image) -Capture -AllowFailure
        if ($removed.ExitCode -eq 0) {
            Write-Host "Removed image: $image"
        } else {
            Write-Warning "Image kept: $image. $($removed.ErrorText.Trim())"
        }
    }
    Write-Host "Reset complete: $script:EffectiveProject" -ForegroundColor Green
    Write-Host 'Source files and .env were preserved. Build cache is retained; start-docker rebuilds without it by default.'
    exit 0
} catch {
    Write-Error $_.Exception.Message -ErrorAction Continue
    Show-Diagnostics
    exit 1
}
