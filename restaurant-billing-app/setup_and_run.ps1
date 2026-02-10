<#
.SYNOPSIS
    Automated Setup and Run Script for Restaurant Billing App
    
.DESCRIPTION
    This script installs necessary dependencies (Node.js, PostgreSQL 17, pgAdmin 4),
    configures the database, installs project packages, and starts the application.
    
    WARNING: This script should be run as Administrator.
#>

# Check for Administrator privileges
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "This script requires Administrator privileges to install software."
    Write-Warning "Please right-click the script and select 'Run with PowerShell' -> 'Run as Administrator', or run 'powershell' as admin."
    Exit
}

$ErrorActionPreference = "Stop"
$scriptPath = $PSScriptRoot
$dbName = "restaurant_billing_db"
$dbUser = "postgres"
$dbHost = "localhost"
$dbPort = "5432"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RESTAURANT BILLING APP - AUTOMATED SETUP & RUN" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ==============================================================================
# 1. INSTALL DEPENDENCIES (Node.js, PostgreSQL, pgAdmin 4)
# ==============================================================================

Write-Host "`n[1/5] Checking and Installing Dependencies..." -ForegroundColor Yellow

# Function to check command availability
function Test-CommandExists {
    param ($command)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $path = Get-Command $command
    $ErrorActionPreference = $oldPreference
    return $path -ne $null
}

# Install Node.js
if (Test-CommandExists "node") {
    Write-Host "   - Node.js is already installed." -ForegroundColor Green
} else {
    Write-Host "   - Installing Node.js (LTS)..." -ForegroundColor Cyan
    winget install OpenJS.NodeJS.LTS --accept-source_agreements --accept-package-agreements --silent
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install Node.js." }
    # Refresh env for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Install PostgreSQL
if (Test-CommandExists "psql") {
    Write-Host "   - PostgreSQL is already installed." -ForegroundColor Green
} else {
    Write-Host "   - Installing PostgreSQL 17..." -ForegroundColor Cyan
    # Using interactive mode so user can set the superuser password
    Write-Host "   PLEASE NOTE: The PostgreSQL installer will open." -ForegroundColor Magenta
    Write-Host "   IMPORTANT: During installation, you will be asked to set a password for the 'postgres' user." -ForegroundColor Magenta
    Write-Host "   REMEMBER THIS PASSWORD! You will need to enter it shortly." -ForegroundColor Magenta
    
    winget install PostgreSQL.PostgreSQL --version 17 --accept-source_agreements --accept-package-agreements --interactive
    
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install PostgreSQL." }
    
    # Add Postgres bin to path manually if needed (Standard path)
    $pgPath = "C:\Program Files\PostgreSQL\17\bin"
    if (Test-Path $pgPath) {
        $env:Path += ";$pgPath"
        Write-Host "   - Added PostgreSQL bin to PATH." -ForegroundColor Green
    }
}

# Install pgAdmin 4
Write-Host "   - Checking pgAdmin 4..." -ForegroundColor Cyan
winget install PostgreSQL.pgAdmin --accept-source_agreements --accept-package-agreements --silent --force
Write-Host "   - pgAdmin 4 check/install complete." -ForegroundColor Green

# ==============================================================================
# 2. DATABASE CONFIGURATION
# ==============================================================================

Write-Host "`n[2/5] Configuring Database..." -ForegroundColor Yellow

# Prompt for DB Password
Write-Host "`n----------------------------------------------------------"
Write-Host "Please enter the password for the PostgreSQL 'postgres' user." -ForegroundColor Cyan
Write-Host "(This is the password you set during installation)" -ForegroundColor Cyan
$pgPassword = Read-Host -Prompt "Password" -AsSecureString
$pgPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword))
$env:PGPASSWORD = $pgPasswordPlain

# Create Database
Write-Host "   - Creating database '$dbName'..." -ForegroundColor Cyan
try {
    # Check if DB exists first, if not create
    psql -U $dbUser -h $dbHost -p $dbPort -tc "SELECT 1 FROM pg_database WHERE datname = '$dbName'" | grep -q 1
    if ($LASTEXITCODE -ne 0) {
       createdb -U $dbUser -h $dbHost -p $dbPort $dbName
       Write-Host "   - Database created successfully." -ForegroundColor Green
    } else {
       Write-Host "   - Database '$dbName' already exists." -ForegroundColor Yellow
    }
} catch {
    # createdb might throw if exists or connection fails, try proceeding or catch error
    Write-Host "   - Attempting to create database (ignore error if exists)..." -ForegroundColor DarkGray
    createdb -U $dbUser -h $dbHost -p $dbPort $dbName 2>$null
}

# Run Final.sql script
$sqlFile = Join-Path $scriptPath "Final.sql"
if (Test-Path $sqlFile) {
    Write-Host "   - Executing schema script ($sqlFile)..." -ForegroundColor Cyan
    psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -f $sqlFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   - Schema applied successfully." -ForegroundColor Green
    } else {
        Write-Error "Failed to apply schema script. Please check connection/password."
    }
} else {
    Write-Error "Final.sql not found in $scriptPath"
}

# ==============================================================================
# 3. BACKEND SETUP
# ==============================================================================

Write-Host "`n[3/5] Setting up Backend..." -ForegroundColor Yellow
$backendPath = Join-Path $scriptPath "backend"

# Create .env
$backendEnv = Join-Path $backendPath ".env"
$backendEnvContent = @"
PORT=8000
DB_USER=$dbUser
DB_HOST=$dbHost
DB_NAME=$dbName
DB_PASSWORD=$pgPasswordPlain
DB_PORT=$dbPort
NODE_ENV=development
"@
Set-Content -Path $backendEnv -Value $backendEnvContent
Write-Host "   - Backend .env file created." -ForegroundColor Green

# Install Dependencies
Write-Host "   - Installing backend NPM packages..." -ForegroundColor Cyan
Push-Location $backendPath
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "Backend npm install failed." }
Pop-Location

# ==============================================================================
# 4. FRONTEND SETUP
# ==============================================================================

Write-Host "`n[4/5] Setting up Frontend..." -ForegroundColor Yellow
$frontendPath = Join-Path $scriptPath "frontend"

# Create .env
$frontendEnv = Join-Path $frontendPath ".env"
$frontendEnvContent = @"
REACT_APP_API_URL=http://localhost:8000/api
"@
Set-Content -Path $frontendEnv -Value $frontendEnvContent
Write-Host "   - Frontend .env file created." -ForegroundColor Green

# Install Dependencies
Write-Host "   - Installing frontend NPM packages..." -ForegroundColor Cyan
Push-Location $frontendPath
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend npm install failed." }
Pop-Location

# ==============================================================================
# 5. START APPLICATION
# ==============================================================================

Write-Host "`n[5/5] Starting Application..." -ForegroundColor Yellow

# Start Backend
Write-Host "   - Starting Backend Server..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $backendPath -WindowStyle Normal

# Start Frontend
Write-Host "   - Starting Frontend Client..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $frontendPath -WindowStyle Normal

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   SETUP COMPLETE!" -ForegroundColor Green
Write-Host "   Backend is running on port 8000."
Write-Host "   Frontend is launching on port 3000."
Write-Host "==========================================================" -ForegroundColor Cyan
