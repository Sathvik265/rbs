<#
install-nssm.ps1

Helper to install the backend Node app as a Windows service using NSSM.

Usage (run elevated PowerShell on the server):

.\install-nssm.ps1 -ServiceName RBSBackend -NodePath 'C:\Program Files\nodejs\node.exe' \
  -AppPath 'C:\inetpub\wwwroot\rbs\backend\src\app.js' -AppDirectory 'C:\inetpub\wwwroot\rbs\backend' \
  -EnvString 'PORT=8000;DB_HOST=127.0.0.1;DB_USER=postgres;DB_PASSWORD=secret;DB_NAME=restaurant_billing' -StartService

Parameters:
- ServiceName: name for the Windows service (default: RBSBackend)
- NssmPath: Optional full path to nssm.exe. If omitted, script looks on PATH.
- NodePath: path to node.exe (default: 'C:\Program Files\nodejs\node.exe')
- AppPath: path to your backend entry JS file (required)
- AppDirectory: working directory for the app (optional)
- EnvString: environment variables to set for the service (semicolon-separated, e.g. "KEY=val;KEY2=val2")
- StartService: switch to start the service after installing

Notes:
- This script does not download NSSM automatically. Please place `nssm.exe` on PATH or provide `-NssmPath`.
- Run PowerShell as Administrator when installing services.

#>

param(
  [string]$ServiceName = 'RBSBackend',
  [string]$NssmPath = '',
  [string]$NodePath = 'C:\Program Files\nodejs\node.exe',
  [Parameter(Mandatory=$true)][string]$AppPath,
  [string]$AppDirectory = '',
  [string]$EnvString = '',
  [switch]$StartService
)

Set-StrictMode -Version Latest

function Find-Nssm {
  param([string]$Provided)
  if ($Provided -and (Test-Path $Provided)) { return (Resolve-Path $Provided).Path }
  $envPath = (Get-Command nssm -ErrorAction SilentlyContinue)
  if ($envPath) { return $envPath.Path }
  return $null
}

$nssm = Find-Nssm -Provided $NssmPath
if (-not $nssm) {
  Write-Error "nssm.exe not found on PATH and no -NssmPath provided. Download NSSM from https://nssm.cc/ and rerun with -NssmPath 'C:\path\to\nssm.exe'"
  exit 1
}

if (-not (Test-Path $NodePath)) {
  Write-Warning "node.exe not found at $NodePath. Please install Node.js and provide -NodePath if needed."
}

if (-not (Test-Path $AppPath)) {
  Write-Error "AppPath not found: $AppPath"
  exit 1
}

Write-Host "Installing service '$ServiceName' using NSSM at: $nssm"

# Install service
& "$nssm" install $ServiceName "$NodePath" "$AppPath"

if ($AppDirectory) {
  Write-Host "Setting AppDirectory: $AppDirectory"
  & "$nssm" set $ServiceName AppDirectory "$AppDirectory"
}

if ($EnvString) {
  Write-Host "Setting environment variables for service"
  & "$nssm" set $ServiceName AppEnvironmentExtra "$EnvString"
}

Write-Host "Configured service $ServiceName. To view/edit service settings use: $nssm edit $ServiceName"

if ($StartService) {
  Write-Host "Starting service $ServiceName..."
  & "$nssm" start $ServiceName
  Start-Sleep -Seconds 2
  $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -eq 'Running') {
    Write-Host "Service $ServiceName is running."
  } else {
    Write-Warning "Service $ServiceName did not start. Check NSSM logs or Event Viewer."
  }
}

Write-Host "Done."
