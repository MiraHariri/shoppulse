# ShopPulse Backend Deployment Script (PowerShell)
# This script loads environment variables and deploys the backend

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Stage = 'dev',
    
    [Parameter(Mandatory=$false)]
    [string]$Region = 'us-east-1',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false
)

Write-Host "ShopPulse Backend Deployment" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file from .env.example" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run: Copy-Item .env.example .env" -ForegroundColor Yellow
    exit 1
}

# Load environment variables from .env file
Write-Host "Loading environment variables from .env..." -ForegroundColor Green
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        Write-Host "  Loaded: $name" -ForegroundColor Gray
    }
}
Write-Host ""

# Verify required environment variables
$requiredVars = @(
    'COGNITO_USER_POOL_ID',
    'RDS_HOST',
    'RDS_USERNAME',
    'RDS_PASSWORD',
    'LAMBDA_SECURITY_GROUP_ID',
    'LAMBDA_SUBNET_ID_1',
    'LAMBDA_SUBNET_ID_2'
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not [Environment]::GetEnvironmentVariable($var, 'Process')) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "Error: Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please update your .env file with all required values" -ForegroundColor Yellow
    exit 1
}

Write-Host "All required environment variables are set" -ForegroundColor Green
Write-Host ""

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Build TypeScript
if (-not $SkipBuild) {
    Write-Host "Building TypeScript..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed successfully" -ForegroundColor Green
    Write-Host ""
}

# Deploy with Serverless
Write-Host "Deploying to AWS..." -ForegroundColor Yellow
Write-Host "  Stage: $Stage" -ForegroundColor Cyan
Write-Host "  Region: $Region" -ForegroundColor Cyan
Write-Host ""

$deployCommand = "serverless deploy --stage $Stage --region $Region"
Write-Host "Running: $deployCommand" -ForegroundColor Gray
Write-Host ""

Invoke-Expression $deployCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Copy the API Gateway endpoint URL from the output above" -ForegroundColor White
    Write-Host "  2. Update your frontend .env file with the API URL" -ForegroundColor White
    Write-Host "  3. Test the endpoints using the deployment guide" -ForegroundColor White
    Write-Host ""
    Write-Host "View logs: npm run logs" -ForegroundColor Yellow
    Write-Host "Remove deployment: serverless remove --stage $Stage" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details" -ForegroundColor Yellow
    exit 1
}
