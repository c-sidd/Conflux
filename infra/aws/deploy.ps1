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

# Step 1: Ensure ECR Repository exists and push image BEFORE CloudFormation
Write-Host "==> Step 1: Ensuring ECR Repository exists and pushing image tag $ImageTag..." -ForegroundColor Yellow
$EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/conflux-api"

try {
    aws ecr describe-repositories --repository-names conflux-api --region $Region 2>$null | Out-Null
} catch {
    aws ecr create-repository --repository-name conflux-api --region $Region --image-scanning-configuration scanOnPush=true | Out-Null
}

Write-Host "==> Logging into Amazon ECR..." -ForegroundColor Yellow
$EcrPassword = aws ecr get-login-password --region $Region
docker login --username AWS --password $EcrPassword $EcrUri

Write-Host "==> Building backend container image..." -ForegroundColor Yellow
docker build -t "$EcrUri`:$ImageTag" -t "$EcrUri`:latest" ./backend

Write-Host "==> Pushing backend container image to Amazon ECR..." -ForegroundColor Yellow
docker push "$EcrUri`:$ImageTag"
docker push "$EcrUri`:latest"

# Step 2: Deploy CloudFormation Stack (Zero Initial Tasks to Prevent Premature Health Check Failures)
Write-Host "==> Step 2: Deploying CloudFormation Stack ($StackName)..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file infra/aws/cloudformation-template.yaml `
    --stack-name $StackName `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $Region `
    --parameter-overrides `
        EnvironmentName=$Environment `
        UseExternalDatabase=$UseExternalDatabase `
        DbPassword=$DbPassword `
        ImageTag=$ImageTag `
        ApiDesiredCount=0 `
        WorkerDesiredCount=0

Write-Host "==> Fetching stack outputs..." -ForegroundColor Yellow
$S3Bucket = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='FrontendS3Bucket'].OutputValue" --output text).Trim()
$CfDistId = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text).Trim()
$CfUrl = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text).Trim()
$SecretsArn = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='SecretsManagerArn'].OutputValue" --output text).Trim()
$RedisAddr = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='RedisAddress'].OutputValue" --output text 2>$null)
$RedisPort = (aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='RedisPort'].OutputValue" --output text 2>$null)

Write-Host "ECR URI:       $EcrUri" -ForegroundColor Green
Write-Host "S3 Bucket:     $S3Bucket" -ForegroundColor Green
Write-Host "CloudFront ID: $CfDistId" -ForegroundColor Green
Write-Host "Public URL:    $CfUrl" -ForegroundColor Green

# Step 3: Safely merge secrets into Secrets Manager (Preserving existing keys & OAuth)
Write-Host "==> Step 3: Populating / Merging application secrets in Secrets Manager..." -ForegroundColor Yellow
$env:SECRETS_ARN = $SecretsArn
$env:AWS_REGION = $Region
$env:NEON_DATABASE_URL = $NeonDatabaseUrl
$env:REDIS_ADDR = if ($RedisAddr) { $RedisAddr.Trim() } else { "" }
$env:REDIS_PORT = if ($RedisPort) { $RedisPort.Trim() } else { "6379" }

python infra/aws/populate_secrets.py

# Step 4: Run Database Migrations
Write-Host "==> Step 4: Running database migrations on ECS against Neon..." -ForegroundColor Yellow
& "infra/aws/run-migration.ps1" -Environment $Environment

# Step 5: Scale Up and Roll Out ECS Services
Write-Host "==> Step 5: Scaling up and rolling out ECS services..." -ForegroundColor Yellow
aws ecs update-service --cluster "conflux-cluster-$Environment" --service "conflux-api-service-$Environment" --desired-count 2 --force-new-deployment --region $Region | Out-Null
aws ecs update-service --cluster "conflux-cluster-$Environment" --service "conflux-worker-service-$Environment" --desired-count 1 --force-new-deployment --region $Region | Out-Null

# Step 6: Build and Deploy Frontend
Write-Host "==> Step 6: Building frontend production bundle..." -ForegroundColor Yellow
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

Write-Host "==> Step 7: Verifying CloudFront backend health check (/api/health)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    $HealthResponse = Invoke-WebRequest -Uri "$CfUrl/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "CloudFront /api/health returned HTTP $($HealthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Health probe returned: $_" -ForegroundColor DarkYellow
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Conflux Deployment Completed Successfully!" -ForegroundColor Green
Write-Host " Public Application URL: $CfUrl" -ForegroundColor Green
Write-Host " Health Endpoint:        $CfUrl/api/health" -ForegroundColor Green
Write-Host " Readiness Endpoint:     $CfUrl/api/ready" -ForegroundColor Green
Write-Host " Secrets Manager Secret: $SecretsArn" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
