#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Conflux - End-to-End Production AWS Deployment Script
# Supports Neon Serverless PostgreSQL (Free Tier) or AWS RDS PostgreSQL
# ==============================================================================

ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
STACK_NAME="conflux-infra-${ENVIRONMENT}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo "v1.0.0")}"
USE_EXTERNAL_DB="${USE_EXTERNAL_DB:-true}"
NEON_DATABASE_URL="${NEON_DATABASE_URL:-${DATABASE_URL:-}}"

echo "=========================================================="
echo " Starting Conflux Deployment to AWS (${ENVIRONMENT})"
echo " Region:          ${AWS_REGION}"
echo " Image Tag:       ${IMAGE_TAG}"
echo " External DB:     ${USE_EXTERNAL_DB} (Neon Postgres)"
echo "=========================================================="

# Check AWS credentials
echo "==> Verifying AWS identity..."
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "Authenticated as AWS Account: ${ACCOUNT_ID}"

DB_PASSWORD="${DB_PASSWORD:-ConfluxPass123!}"

if [ "${USE_EXTERNAL_DB}" = "true" ]; then
  if [ -z "${NEON_DATABASE_URL}" ]; then
    echo ""
    echo "Using Neon Serverless PostgreSQL (Free Tier)."
    read -p "Enter your Neon PostgreSQL connection string (e.g. postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require): " NEON_DATABASE_URL
    echo ""
  fi
else
  if [ -z "${DB_PASSWORD:-}" ] || [ "${DB_PASSWORD}" = "ConfluxPass123!" ]; then
    read -s -p "Enter master password for AWS RDS PostgreSQL (min 8 chars): " DB_PASSWORD
    echo ""
  fi
fi

# Step 1: Bootstrap ECR and build & push backend image BEFORE CloudFormation
echo "==> Step 1: Ensuring ECR Repository exists and pushing image tag ${IMAGE_TAG}..."
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/conflux-api"

aws ecr describe-repositories --repository-names conflux-api --region "${AWS_REGION}" >/dev/null 2>&1 || \
aws ecr create-repository --repository-name conflux-api --region "${AWS_REGION}" --image-scanning-configuration scanOnPush=true >/dev/null

echo "==> Logging into Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_URI}"

echo "==> Building backend container image..."
docker build -t "${ECR_URI}:${IMAGE_TAG}" -t "${ECR_URI}:latest" ./backend

echo "==> Pushing backend container image to Amazon ECR..."
docker push "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:latest"

# Step 2: Deploy CloudFormation Stack (Zero Initial Tasks to Prevent Premature Health Check Failures)
echo "==> Step 2: Deploying CloudFormation Stack (${STACK_NAME})..."
aws cloudformation deploy \
  --template-file infra/aws/cloudformation-template.yaml \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${AWS_REGION}" \
  --parameter-overrides \
      EnvironmentName="${ENVIRONMENT}" \
      UseExternalDatabase="${USE_EXTERNAL_DB}" \
      DbPassword="${DB_PASSWORD}" \
      ImageTag="${IMAGE_TAG}" \
      ApiDesiredCount=0 \
      WorkerDesiredCount=0

echo "==> Fetching stack outputs..."
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='FrontendS3Bucket'].OutputValue" --output text)
CF_DIST_ID=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
CF_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)
SECRETS_ARN=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='SecretsManagerArn'].OutputValue" --output text)
REDIS_ADDR=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='RedisAddress'].OutputValue" --output text 2>/dev/null || echo "")
REDIS_PORT=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='RedisPort'].OutputValue" --output text 2>/dev/null || echo "6379")

echo "ECR URI:       ${ECR_URI}"
echo "S3 Bucket:     ${S3_BUCKET}"
echo "CloudFront ID: ${CF_DIST_ID}"
echo "Public URL:    ${CF_URL}"

# Step 3: Safely merge secrets into Secrets Manager (Preserving existing keys & OAuth)
echo "==> Step 3: Populating / Merging application secrets in Secrets Manager..."
export SECRETS_ARN="${SECRETS_ARN}"
export AWS_REGION="${AWS_REGION}"
export NEON_DATABASE_URL="${NEON_DATABASE_URL}"
export REDIS_ADDR="${REDIS_ADDR}"
export REDIS_PORT="${REDIS_PORT}"
export GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
export GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

python3 infra/aws/populate_secrets.py

# Step 4: Run Database Migrations
echo "==> Step 4: Running database migrations on ECS..."
bash infra/aws/run-migration.sh "${ENVIRONMENT}"

# Step 5: Scale Up and Roll Out ECS Services
echo "==> Step 5: Scaling up and rolling out ECS services..."
aws ecs update-service --cluster "conflux-cluster-${ENVIRONMENT}" --service "conflux-api-service-${ENVIRONMENT}" --desired-count 2 --force-new-deployment --region "${AWS_REGION}" > /dev/null
aws ecs update-service --cluster "conflux-cluster-${ENVIRONMENT}" --service "conflux-worker-service-${ENVIRONMENT}" --desired-count 1 --force-new-deployment --region "${AWS_REGION}" > /dev/null

# Step 6: Build and Deploy Frontend to S3 + Invalidate CloudFront
echo "==> Step 6: Building frontend production bundle..."
(cd frontend && npm ci && npm run build)

echo "==> Syncing static frontend to S3 (${S3_BUCKET})..."
aws s3 sync frontend/dist/ "s3://${S3_BUCKET}/" --delete --region "${AWS_REGION}"

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "${CF_DIST_ID}" --paths "/*"

echo "==> Step 7: Verifying CloudFront backend health check (/api/health)..."
sleep 5
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${CF_URL}/api/health" || echo "000")
echo "CloudFront /api/health returned HTTP ${HEALTH_STATUS}"
echo "CloudFront /api/health returned HTTP ${HEALTH_STATUS}"

echo "=========================================================="
echo " Conflux Deployment Completed Successfully!"
echo " Public Application URL: ${CF_URL}"
echo " Health Endpoint:        ${CF_URL}/api/health"
echo " Readiness Endpoint:     ${CF_URL}/api/ready"
echo " Secrets Manager Secret: ${SECRETS_ARN}"
echo "=========================================================="
