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

# 1. Deploy CloudFormation Stack
echo "==> Step 1: Deploying CloudFormation Stack (${STACK_NAME})..."
aws cloudformation deploy \
  --template-file infra/aws/cloudformation-template.yaml \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${AWS_REGION}" \
  --parameter-overrides \
      EnvironmentName="${ENVIRONMENT}" \
      UseExternalDatabase="${USE_EXTERNAL_DB}" \
      DbPassword="${DB_PASSWORD}" \
      ImageTag="${IMAGE_TAG}"

echo "==> Fetching stack outputs..."
ECR_URI=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" --output text)
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='FrontendS3Bucket'].OutputValue" --output text)
CF_DIST_ID=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
CF_URL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)
SECRETS_ARN=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='SecretsManagerArn'].OutputValue" --output text)

echo "ECR URI:       ${ECR_URI}"
echo "S3 Bucket:     ${S3_BUCKET}"
echo "CloudFront ID: ${CF_DIST_ID}"
echo "Public URL:    ${CF_URL}"

# If using Neon, configure Secrets Manager with Neon connection URL
if [ "${USE_EXTERNAL_DB}" = "true" ] && [ -n "${NEON_DATABASE_URL}" ]; then
  echo "==> Updating AWS Secrets Manager with your Neon PostgreSQL URL..."
  # Generate cryptographic secrets if not set
  GEN_SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || python -c "import secrets; print(secrets.token_hex(32))")
  GEN_CSRF_SECRET=$(openssl rand -hex 32 2>/dev/null || python -c "import secrets; print(secrets.token_hex(32))")
  GEN_TOKEN_KEY=$(python -c "import secrets, base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())")

  # Fetch existing secret to preserve any existing OAuth client credentials
  CURRENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "${SECRETS_ARN}" --query "SecretString" --output text 2>/dev/null || echo "{}")
  GOOGLE_ID=$(python -c "import json; d=json.loads('''$CURRENT_SECRET'''); print(d.get('GOOGLE_CLIENT_ID', 'placeholder'))" 2>/dev/null || echo "placeholder")
  GOOGLE_SECRET=$(python -c "import json; d=json.loads('''$CURRENT_SECRET'''); print(d.get('GOOGLE_CLIENT_SECRET', 'placeholder'))" 2>/dev/null || echo "placeholder")
  REDIS_URL=$(python -c "import json; d=json.loads('''$CURRENT_SECRET'''); print(d.get('REDIS_URL', 'redis://localhost:6379/0'))" 2>/dev/null || echo "redis://localhost:6379/0")

  NEW_SECRET_JSON=$(python -c "
import json
print(json.dumps({
    'DATABASE_URL': '$NEON_DATABASE_URL',
    'DATABASE_SYNC_URL': '$NEON_DATABASE_URL',
    'REDIS_URL': '$REDIS_URL',
    'SESSION_SECRET': '$GEN_SESSION_SECRET',
    'CSRF_SECRET': '$GEN_CSRF_SECRET',
    'TOKEN_ENCRYPTION_KEY': '$GEN_TOKEN_KEY',
    'GOOGLE_CLIENT_ID': '$GOOGLE_ID',
    'GOOGLE_CLIENT_SECRET': '$GOOGLE_SECRET'
}))
")
  aws secretsmanager put-secret-value --secret-id "${SECRETS_ARN}" --secret-string "${NEW_SECRET_JSON}" > /dev/null
  echo "==> Secrets Manager successfully updated with Neon database credentials."
fi

# 2. Build and Push Backend Docker Image
echo "==> Step 2: Logging into Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_URI}"

echo "==> Building backend container image..."
docker build -t "${ECR_URI}:${IMAGE_TAG}" -t "${ECR_URI}:latest" ./backend

echo "==> Pushing backend container image to Amazon ECR..."
docker push "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:latest"

# 3. Run Database Migrations
echo "==> Step 3: Running database migrations on ECS against Neon PostgreSQL..."
bash infra/aws/run-migration.sh "${ENVIRONMENT}"

# 4. Build and Deploy Frontend to S3 + Invalidate CloudFront
echo "==> Step 4: Building frontend production bundle..."
(cd frontend && npm ci && npm run build)

echo "==> Syncing static frontend to S3 (${S3_BUCKET})..."
aws s3 sync frontend/dist/ "s3://${S3_BUCKET}/" --delete --region "${AWS_REGION}"

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "${CF_DIST_ID}" --paths "/*"

# 5. Force New Deployment on ECS
echo "==> Step 5: Rolling out new ECS services..."
aws ecs update-service --cluster "conflux-cluster-${ENVIRONMENT}" --service "conflux-api-service-${ENVIRONMENT}" --force-new-deployment --region "${AWS_REGION}" > /dev/null
aws ecs update-service --cluster "conflux-cluster-${ENVIRONMENT}" --service "conflux-worker-service-${ENVIRONMENT}" --force-new-deployment --region "${AWS_REGION}" > /dev/null

echo "=========================================================="
echo " Conflux Deployment Completed Successfully!"
echo " Public Application URL: ${CF_URL}"
echo " Database:               Neon PostgreSQL (Free Serverless)"
echo " Secrets Manager Secret: ${SECRETS_ARN}"
echo "=========================================================="
