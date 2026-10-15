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

# Step 2: Deploy CloudFormation Stack (Image is now guaranteed to exist in ECR)
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
      ImageTag="${IMAGE_TAG}"

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
CURRENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "${SECRETS_ARN}" --query "SecretString" --output text 2>/dev/null || echo "{}")

NEW_SECRET_JSON=$(python - <<EOF
import json, secrets, base64

try:
    curr = json.loads('''$CURRENT_SECRET''')
except Exception:
    curr = {}

# Preserve or generate key material
token_key = curr.get('TOKEN_ENCRYPTION_KEY')
if not token_key or 'replace_with' in token_key or 'dGVzdF9' in token_key:
    token_key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()

session_sec = curr.get('SESSION_SECRET')
if not session_sec or 'replace_with' in session_sec or 'development' in session_sec:
    session_sec = secrets.token_hex(32)

csrf_sec = curr.get('CSRF_SECRET')
if not csrf_sec or 'replace_with' in csrf_sec or 'development' in csrf_sec:
    csrf_sec = secrets.token_hex(32)

# Preserve OAuth credentials if present, or accept from environment
google_id = '$GOOGLE_CLIENT_ID' if '$GOOGLE_CLIENT_ID' else curr.get('GOOGLE_CLIENT_ID', 'placeholder')
google_sec = '$GOOGLE_CLIENT_SECRET' if '$GOOGLE_CLIENT_SECRET' else curr.get('GOOGLE_CLIENT_SECRET', 'placeholder')

# Redis endpoint
redis_url = 'redis://$REDIS_ADDR:$REDIS_PORT/0' if '$REDIS_ADDR' else curr.get('REDIS_URL', 'redis://localhost:6379/0')

# Database URLs
db_url = '$NEON_DATABASE_URL' if '$USE_EXTERNAL_DB' == 'true' and '$NEON_DATABASE_URL' else curr.get('DATABASE_URL')
db_sync_url = '$NEON_DATABASE_URL' if '$USE_EXTERNAL_DB' == 'true' and '$NEON_DATABASE_URL' else curr.get('DATABASE_SYNC_URL')

updated = {
    'DATABASE_URL': db_url,
    'DATABASE_SYNC_URL': db_sync_url,
    'REDIS_URL': redis_url,
    'SESSION_SECRET': session_sec,
    'CSRF_SECRET': csrf_sec,
    'TOKEN_ENCRYPTION_KEY': token_key,
    'GOOGLE_CLIENT_ID': google_id,
    'GOOGLE_CLIENT_SECRET': google_sec
}
print(json.dumps(updated))
EOF
)

aws secretsmanager put-secret-value --secret-id "${SECRETS_ARN}" --secret-string "${NEW_SECRET_JSON}" > /dev/null
echo "==> Secrets Manager successfully updated with preserved key material."

# Step 4: Run Database Migrations
echo "==> Step 4: Running database migrations on ECS..."
bash infra/aws/run-migration.sh "${ENVIRONMENT}"

# Step 5: Build and Deploy Frontend to S3 + Invalidate CloudFront
echo "==> Step 5: Building frontend production bundle..."
(cd frontend && npm ci && npm run build)

echo "==> Syncing static frontend to S3 (${S3_BUCKET})..."
aws s3 sync frontend/dist/ "s3://${S3_BUCKET}/" --delete --region "${AWS_REGION}"

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "${CF_DIST_ID}" --paths "/*"

# Step 6: Force New Deployment on ECS
echo "==> Step 6: Rolling out new ECS services..."
aws ecs update-service --cluster "conflux-cluster-${ENVIRONMENT}" --service "conflux-api-service-${ENVIRONMENT}" --force-new-deployment --region "${AWS_REGION}" > /dev/null
aws ecs update-service --cluster "conflux-cluster-${ENVIRONMENT}" --service "conflux-worker-service-${ENVIRONMENT}" --force-new-deployment --region "${AWS_REGION}" > /dev/null

echo "==> Step 7: Verifying CloudFront backend health check (/api/health)..."
sleep 5
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${CF_URL}/api/health" || echo "000")
echo "CloudFront /api/health returned HTTP ${HEALTH_STATUS}"

echo "=========================================================="
echo " Conflux Deployment Completed Successfully!"
echo " Public Application URL: ${CF_URL}"
echo " Health Endpoint:        ${CF_URL}/api/health"
echo " Readiness Endpoint:     ${CF_URL}/api/ready"
echo " Secrets Manager Secret: ${SECRETS_ARN}"
echo "=========================================================="
