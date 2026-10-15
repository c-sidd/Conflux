# ==============================================================================
# Conflux - End-to-End Production AWS Deployment Script (PowerShell)
# Supports Neon Serverless PostgreSQL (Free Tier) or AWS RDS PostgreSQL
# ==============================================================================
param (
    [string]$Environment = "production",
    [string]$Region = "us-east-1",
    [string]$UseExternalDatabase = "true",
    [string]$NeonDatabaseUrl = "",
    [string]$DbPassword = "ConfluxPass123!"
)

$ErrorActionPreference = "Stop"
$StackName = "conflux-infra-$Environment"

# Image tag
try {
    $ImageTag = (git rev-parse --short HEAD 2>$null).Trim()
} catch {
    $ImageTag = "v1.0.0"
}
if (-not $ImageTag) { $ImageTag = "v1.0.0" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Conflux Deployment to AWS ($Environment)" -ForegroundColor Cyan
Write-Host " Region:          $Region" -ForegroundColor Cyan
Write-Host " Image Tag:       $ImageTag" -ForegroundColor Cyan
Write-Host " External DB:     $UseExternalDatabase (Neon Postgres)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify AWS credentials
Write-Host "==> Verifying AWS identity..." -ForegroundColor Yellow
$AccountId = (aws sts get-caller-identity --query "Account" --output text).Trim()
Write-Host "Authenticated as AWS Account: $AccountId" -ForegroundColor Green

if ($UseExternalDatabase -eq "true") {
    if (-not $NeonDatabaseUrl) {
        Write-Host ""
        $NeonDatabaseUrl = Read-Host -Prompt "Enter your Neon PostgreSQL connection string (e.g. postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require)"
        Write-Host ""
    }
} else {
    if ($DbPassword -eq "ConfluxPass123!") {
        $SecurePass = Read-Host -Prompt "Enter master password for AWS RDS PostgreSQL (min 8 chars)" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePass)
        $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    }
}

# 2. Deploy CloudFormation Stack
Write-Host "==> Step 1: Deploying CloudFormation Stack ($StackName)..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file infra/aws/cloudformation-template.yaml `
    --stack-name $StackName `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $Region `
    --parameter-overrides `
        EnvironmentName=$Environment `
        UseExternalDatabase=$UseExternalDatabase `
        DbPassword=$DbPassword `
        ImageTag=$ImageTag

Write-Host "==> Fetching stack outputs..." -ForegroundColor Yellow
$EcrUri = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" --output text).Trim()
$S3Bucket = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='FrontendS3Bucket'].OutputValue" --output text).Trim()
$CfDistId = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text).Trim()
$CfUrl = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text).Trim()
$SecretsArn = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='SecretsManagerArn'].OutputValue" --output text).Trim()

Write-Host "ECR URI:       $EcrUri" -ForegroundColor Green
Write-Host "S3 Bucket:     $S3Bucket" -ForegroundColor Green
Write-Host "CloudFront ID: $CfDistId" -ForegroundColor Green
Write-Host "Public URL:    $CfUrl" -ForegroundColor Green

# Update Secrets Manager with Neon URL if provided
if ($UseExternalDatabase -eq "true" -and $NeonDatabaseUrl) {
    Write-Host "==> Updating AWS Secrets Manager with your Neon PostgreSQL URL..." -ForegroundColor Yellow
    $GenSessionSecret = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
    $GenCsrfSecret = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
    $Bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($Bytes)
    $GenTokenKey = [System.Convert]::ToBase64String($Bytes)

    $NewSecretObj = @{
        DATABASE_URL = $NeonDatabaseUrl
        DATABASE_SYNC_URL = $NeonDatabaseUrl
        REDIS_URL = "redis://placeholder:6379/0"
        SESSION_SECRET = $GenSessionSecret
        CSRF_SECRET = $GenCsrfSecret
        TOKEN_ENCRYPTION_KEY = $GenTokenKey
        GOOGLE_CLIENT_ID = "placeholder"
        GOOGLE_CLIENT_SECRET = "placeholder"
    }
    $NewSecretJson = $NewSecretObj | ConvertTo-Json -Compress
    aws secretsmanager put-secret-value --secret-id $SecretsArn --secret-string $NewSecretJson | Out-Null
    Write-Host "==> Secrets Manager successfully updated with Neon database credentials." -ForegroundColor Green
}

# 3. Build and Push Backend Docker Image
Write-Host "==> Step 2: Logging into Amazon ECR..." -ForegroundColor Yellow
$EcrPassword = aws ecr get-login-password --region $Region
docker login --username AWS --password $EcrPassword $EcrUri

Write-Host "==> Building backend container image..." -ForegroundColor Yellow
docker build -t "$EcrUri`:$ImageTag" -t "$EcrUri`:latest" ./backend

Write-Host "==> Pushing backend container image to Amazon ECR..." -ForegroundColor Yellow
docker push "$EcrUri`:$ImageTag"
docker push "$EcrUri`:latest"

# 4. Run Database Migrations
Write-Host "==> Step 3: Running database migrations on ECS against Neon..." -ForegroundColor Yellow
& "infra/aws/run-migration.ps1" -Environment $Environment

# 5. Build and Deploy Frontend
Write-Host "==> Step 4: Building frontend production bundle..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm ci
    npm run build
} finally {
    Pop-Location
}

Write-Host "==> Syncing static frontend to S3 ($S3Bucket)..." -ForegroundColor Yellow
aws s3 sync frontend/dist/ "s3://$S3Bucket/" --delete --region $Region

Write-Host "==> Invalidating CloudFront cache..." -ForegroundColor Yellow
aws cloudfront create-invalidation --distribution-id $CfDistId --paths "/*"

# 6. Force ECS New Deployment
Write-Host "==> Step 5: Rolling out new ECS services..." -ForegroundColor Yellow
aws ecs update-service --cluster "conflux-cluster-$Environment" --service "conflux-api-service-$Environment" --force-new-deployment --region $Region | Out-Null
aws ecs update-service --cluster "conflux-cluster-$Environment" --service "conflux-worker-service-$Environment" --force-new-deployment --region $Region | Out-Null

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Conflux Deployment Completed Successfully!" -ForegroundColor Green
Write-Host " Public Application URL: $CfUrl" -ForegroundColor Green
Write-Host " Database:               Neon PostgreSQL (Free Serverless)" -ForegroundColor Green
Write-Host " Secrets Manager Secret: $SecretsArn" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
