<#
Publish script - builds frontend, assembles deploy layout and creates a ZIP (and msdeploy package if msdeploy is installed).

Usage:
  From repository root (or run via PowerShell):
    .\restaurant-billing-app\deploy\publish-to-zip.ps1 -OutputZip ..\rbs-deploy.zip

By default the script places the assembled package in the folder where you run it from.
#>

param(
  [string]$OutputZip = "rbs-deploy.zip",
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$MsDeploy,                        # create msdeploy package
  [string]$IISAppName,                      # e.g. 'Default Web Site/MyApp' for local deployment
  [string]$RemoteComputerName,              # e.g. 'https://server:8172/msdeploy.axd' for remote
  [string]$RemoteUserName,
  [string]$RemotePassword,
  [string]$RemoteAuthType = 'Basic'
)

Set-StrictMode -Version Latest
Write-Host "Repo root: $RepoRoot"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$frontendPath = Join-Path $RepoRoot 'restaurant-billing-app\frontend'
$backendPath = Join-Path $RepoRoot 'restaurant-billing-app\backend'
$tempDeploy = Join-Path $scriptDir 'deploy_temp'
$wwwroot = Join-Path $tempDeploy 'wwwroot'
$backendDest = Join-Path $tempDeploy 'backend'
$toolsDest = Join-Path $tempDeploy 'tools'

if (Test-Path $tempDeploy) { Remove-Item -Recurse -Force $tempDeploy }
New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null
New-Item -ItemType Directory -Path $backendDest -Force | Out-Null
New-Item -ItemType Directory -Path $toolsDest -Force | Out-Null

Write-Host "Building frontend..."
Push-Location $frontendPath
if (Test-Path 'package-lock.json') { npm ci } else { npm install }
npm run build
Pop-Location

Write-Host "Copying frontend build to package..."
Copy-Item -Recurse -Force -Path (Join-Path $frontendPath 'build\*') -Destination $wwwroot

Write-Host "Copying backend files (excluding node_modules) to package..."
# Copy source files and package.json; do not copy node_modules
Copy-Item -Recurse -Force -Path (Join-Path $backendPath 'src') -Destination $backendDest
Copy-Item -Force -Path (Join-Path $backendPath 'package.json') -Destination $backendDest
if (Test-Path (Join-Path $backendPath 'package-lock.json')) {
  Copy-Item -Force -Path (Join-Path $backendPath 'package-lock.json') -Destination $backendDest
}

# Copy helper scripts (e.g. install-nssm.ps1) into tools/ if present alongside this script
$installNssm = Join-Path $scriptDir 'install-nssm.ps1'
if (Test-Path $installNssm) {
  Write-Host "Including install helper: install-nssm.ps1"
  Copy-Item -Force -Path $installNssm -Destination $toolsDest
}

Write-Host "Adding web.config for frontend (SPA rewrite + API proxy)..."
$frontendWebConfig = @'
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:8000/api/{R:1}" />
        </rule>
        <rule name="SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@

$frontendWebConfigPath = Join-Path $wwwroot 'web.config'
Set-Content -Path $frontendWebConfigPath -Value $frontendWebConfig -Encoding UTF8

Write-Host "Creating ZIP package: $OutputZip"
if (Test-Path $OutputZip) { Remove-Item -Force $OutputZip }
Compress-Archive -Path (Join-Path $tempDeploy '*') -DestinationPath $OutputZip -Force

# Optionally create an msdeploy package if msdeploy is present
$msdeploy = Get-Command msdeploy -ErrorAction SilentlyContinue
if ($msdeploy -and $MsDeploy) {
  $msdeployPackage = [System.IO.Path]::ChangeExtension($OutputZip, '.msdeploy.zip')
  Write-Host "msdeploy found - creating msdeploy package: $msdeployPackage"
  & msdeploy -verb:sync -source:dirPath="$tempDeploy" -dest:package="$msdeployPackage" -allowUnrecognizedProvider -verbose

  # If user requested deployment to local IIS app
  if ($IISAppName) {
    Write-Host "Deploying msdeploy package to local IIS app: $IISAppName"
    & msdeploy -verb:sync -source:package="$msdeployPackage" -dest:iisApp="$IISAppName" -allowUnrecognizedProvider -verbose
  }

  # If user provided remote computerName and credentials, deploy to remote web management service
  if ($RemoteComputerName) {
    Write-Host "Deploying msdeploy package to remote: $RemoteComputerName"
    $dest = "auto,computerName='$RemoteComputerName',userName='$RemoteUserName',password='$RemotePassword',authType='$RemoteAuthType'"
    & msdeploy -verb:sync -source:package="$msdeployPackage" -dest:$dest -allowUnrecognizedProvider -verbose
  }
}

Write-Host "Cleaning temporary files..."
Remove-Item -Recurse -Force $tempDeploy

Write-Host "Package created: $(Resolve-Path $OutputZip)"
if ($msdeploy) { Write-Host "msdeploy package also created: $(Resolve-Path $msdeployPackage)" }
