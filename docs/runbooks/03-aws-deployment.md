# AWS Production Deployment & Operations Runbook

This guide covers the deployment, configuration, and day-to-day operations of **Conflux** on Amazon Web Services (AWS).

---

## 1. Production Architecture Overview

Conflux runs on an AWS managed infrastructure topology designed for security, horizontal scalability, and low operational overhead:

```
                    ┌───────────────────────────────┐
                    │     Route 53 / Custom DNS     │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      CloudFront CDN (HTTPS)   │
                    └───────┬───────────────┬───────┘
          /* (Static)       │               │ /api/* (Dynamic)
                            ▼               ▼
     ┌────────────────────────────┐   ┌───────────────────────────┐
     │  Amazon S3 (Private, OAC)  │   │ Application Load Balancer │
     │  Frontend SPA Build Assets │   │   (Internet-Facing, ALB)  │
     └────────────────────────────┘   └─────────────┬─────────────┘
                                                    │ Port 8000
                                                    ▼
     ┌────────────────────────────────────────────────────────────┐
     │  Amazon VPC (10.0.0.0/16) — Private Subnets (Multi-AZ)     │
     │                                                            │
     │   ┌───────────────────────┐    ┌───────────────────────┐   │
     │   │   ECS Fargate: API    │    │  ECS Fargate: Worker  │   │
     │   │   (FastAPI Replicas)  │    │  (Celery Sync Worker) │   │
     │   └───────────┬───────────┘    └───────────┬───────────┘   │
     │               │                            │               │
     │               ▼                            ▼               │
     │   ┌───────────────────────┐    ┌───────────────────────┐   │
     │   │ RDS PostgreSQL 16     │    │ ElastiCache Redis     │   │
     │   │ (Encrypted, Private)  │    │ (Private Subnets)     │   │
     │   └───────────────────────┘    └───────────────────────┘   │
     │                                                            │
     │   ┌───────────────────────┐                                │
     │   │ NAT Gateway (Egress)  │ ──► External Google Drive APIs │
     │   └───────────────────────┘                                │
     └────────────────────────────────────────────────────────────┘
               │                                   │
               ▼                                   ▼
     ┌───────────────────┐               ┌───────────────────┐
     │  Secrets Manager  │               │      AWS KMS      │
     │  (App Secrets)    │               │  (Token Cipher)   │
     └───────────────────┘               └───────────────────┘
```

- **Frontend**: Single-Page Application (SPA) built with React/Vite, stored in a private S3 bucket, served through CloudFront with Origin Access Control (OAC).
- **Backend API**: FastAPI application packaged as a container and deployed on AWS ECS Fargate behind an Application Load Balancer (ALB). CloudFront routes all `/api/*` traffic directly to the ALB.
- **Background Worker**: Celery worker running on ECS Fargate in private subnets, processing Google Drive syncing, resumable uploads, and cross-account reconciliation.
- **Database**: Amazon RDS for PostgreSQL 16 (gp3, encrypted at rest with customer-managed KMS key, private subnet placement, automated 7-day backups).
- **Queue & Cache**: Amazon ElastiCache for Redis (in-transit encryption, private subnet placement).
- **Security & Envelope Encryption**: AWS Secrets Manager for secrets and database credentials; AWS KMS for Google OAuth refresh token envelope encryption.
- **Observability**: Amazon CloudWatch log groups (`/ecs/conflux-production`) and CloudWatch metric alarms for high CPU and target health.

---

## 2. Prerequisites

Ensure you have the following installed and configured before starting:
1. **AWS CLI v2**: Authenticated to your target AWS account (`aws configure` or SSO).
   ```bash
   aws sts get-caller-identity
   ```
2. **Docker Desktop / Docker Engine**: Running locally for container builds.
3. **Node.js 20+ & npm**: For building the frontend.
4. **Google Cloud Console OAuth 2.0 Credentials**:
   - Go to [Google Cloud Console -> APIs & Credentials](https://console.cloud.google.com/apis/credentials).
   - Ensure the **Google Drive API** is enabled.
   - Note your `Client ID` and `Client Secret`.

---

## 3. Quickstart: One-Click Automated Deployment

You can deploy the entire infrastructure, build and push containers, execute database migrations, and deploy the frontend using the automated scripts:

### On Linux / macOS:
```bash
chmod +x infra/aws/deploy.sh infra/aws/run-migration.sh
./infra/aws/deploy.sh production
```

### On Windows (PowerShell):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\infra/aws/deploy.ps1 -Environment production
```

The script will prompt for your RDS master password and execute all deployment phases automatically.

---

## 4. Step-by-Step Manual Deployment Guide

If you prefer deploying step-by-step:

### Step 4.1: Deploy CloudFormation Infrastructure
```bash
aws cloudformation deploy \
  --template-file infra/aws/cloudformation-template.yaml \
  --stack-name conflux-infra-production \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      EnvironmentName=production \
      DbPassword="YOUR_STRONG_DB_PASSWORD"
```

Once the stack finishes creating, retrieve the stack outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name conflux-infra-production \
  --query "Stacks[0].Outputs" \
  --output table
```

### Step 4.2: Configure Production Secrets in AWS Secrets Manager
The CloudFormation template provisions an initial Secrets Manager secret named `conflux/production/secrets`.

Generate secure 32-byte hexadecimal strings for secrets:
```bash
python -c "import secrets, base64; print('SESSION_SECRET=' + secrets.token_hex(32)); print('CSRF_SECRET=' + secrets.token_hex(32)); print('TOKEN_ENCRYPTION_KEY=' + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
```

Construct and update the production secret JSON using the RDS and Redis endpoints from your CloudFormation outputs:
```bash
aws secretsmanager put-secret-value \
  --secret-id conflux/production/secrets \
  --secret-string '{
    "DATABASE_URL": "postgresql+asyncpg://conflux_admin:YOUR_STRONG_DB_PASSWORD@conflux-postgres-production.xxxxxx.us-east-1.rds.amazonaws.com:5432/conflux_db",
    "DATABASE_SYNC_URL": "postgresql://conflux_admin:YOUR_STRONG_DB_PASSWORD@conflux-postgres-production.xxxxxx.us-east-1.rds.amazonaws.com:5432/conflux_db",
    "REDIS_URL": "redis://conflux-redis-production.xxxxxx.0001.use1.cache.amazonaws.com:6379/0",
    "SESSION_SECRET": "YOUR_GENERATED_SESSION_SECRET",
    "CSRF_SECRET": "YOUR_GENERATED_CSRF_SECRET",
    "TOKEN_ENCRYPTION_KEY": "YOUR_GENERATED_BASE64_32_BYTE_KEY",
    "GOOGLE_CLIENT_ID": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "YOUR_GOOGLE_CLIENT_SECRET"
  }'
```

### Step 4.3: Configure Google OAuth 2.0 Authorized Redirect URI
In the [Google Cloud Console](https://console.cloud.google.com/):
1. Navigate to **APIs & Services > Credentials**.
2. Open your OAuth 2.0 Web Client credentials.
3. Under **Authorized redirect URIs**, add your CloudFront production URL:
   ```
   https://<YOUR_CLOUDFRONT_DOMAIN_OR_CUSTOM_DOMAIN>/api/v1/accounts/google/callback
   ```
4. Under **Authorized JavaScript origins**, add:
   ```
   https://<YOUR_CLOUDFRONT_DOMAIN_OR_CUSTOM_DOMAIN>
   ```
5. Click **Save**.

### Step 4.4: Build & Push Backend Container Image to Amazon ECR
```bash
# 1. Retrieve ECR Repository URI from stack output
ECR_URI=$(aws cloudformation describe-stacks --stack-name conflux-infra-production --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" --output text)

# 2. Authenticate Docker with Amazon ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${ECR_URI}"

# 3. Build container image
docker build -t "${ECR_URI}:latest" ./backend

# 4. Push to ECR
docker push "${ECR_URI}:latest"
```

### Step 4.5: Run Database Migrations on AWS ECS
Run Alembic migrations as an isolated one-off task before allowing traffic to route to the API containers:
```bash
# On Linux/macOS:
./infra/aws/run-migration.sh production

# On Windows:
.\infra/aws/run-migration.ps1 -Environment production
```

### Step 4.6: Build and Deploy Frontend to Amazon S3 & CloudFront
```bash
# 1. Retrieve S3 Bucket & CloudFront Distribution ID
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name conflux-infra-production --query "Stacks[0].Outputs[?OutputKey=='FrontendS3Bucket'].OutputValue" --output text)
CF_DIST_ID=$(aws cloudformation describe-stacks --stack-name conflux-infra-production --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)

# 2. Build frontend production assets
cd frontend
npm ci
npm run build
cd ..

# 3. Synchronize build assets to private S3 bucket
aws s3 sync frontend/dist/ "s3://${S3_BUCKET}/" --delete

# 4. Invalidate CloudFront edge cache
aws cloudfront create-invalidation --distribution-id "${CF_DIST_ID}" --paths "/*"
```

### Step 4.7: Trigger Rolling Deployment of ECS Services
```bash
aws ecs update-service \
  --cluster conflux-cluster-production \
  --service conflux-api-service-production \
  --force-new-deployment

aws ecs update-service \
  --cluster conflux-cluster-production \
  --service conflux-worker-service-production \
  --force-new-deployment
```

---

## 5. Verification & Smoke Testing

### 1. Health and Readiness Checks
Verify backend health and database connectivity through the CloudFront endpoint:
```bash
CF_URL=$(aws cloudformation describe-stacks --stack-name conflux-infra-production --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)

# Liveness check:
curl -i "${CF_URL}/health"
# Expected response: {"status":"ok","app":"Conflux","env":"production"}

# Readiness check (validates database connection):
curl -i "${CF_URL}/ready"
# Expected response: {"status":"ready","database":"connected"}
```

### 2. Frontend Check
Open `${CF_URL}` in your web browser:
- The Conflux React Single Page Application should load immediately.
- Client-side navigation (e.g., `/settings`, `/trash`) should work seamlessly without 404 errors due to the configured CloudFront SPA error response routing.

### 3. Google OAuth Flow Check
1. Click **Connect Google Account**.
2. Verify that Google's consent screen displays the correct application identity and requested scopes (`https://www.googleapis.com/auth/drive`).
3. Complete the authentication and verify redirection back to Conflux with account status marked as active.

---

## 6. Continuous Deployment (CI/CD) via GitHub Actions

A complete automated deployment pipeline is configured in [`.github/workflows/deploy.yml`](file:///d:/Projects/Conflux/Conflux/.github/workflows/deploy.yml).

### Setting up GitHub OIDC with AWS
Instead of using static, long-lived AWS Access Keys, use GitHub OIDC role assumption:

1. Create an IAM Role for GitHub Actions with trust policy for your GitHub repository:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:<YOUR_GITHUB_ORG_OR_USER>/Conflux:*"
           }
         }
       }
     ]
   }
   ```
2. In your GitHub repository settings, configure **Secrets**:
   - `AWS_DEPLOY_ROLE_ARN`: ARN of the created deployment role.
   - `DB_MASTER_PASSWORD`: Master password for PostgreSQL.
3. Every push to the `main` branch will automatically execute linting, unit tests, integration tests, ECR push, migrations, and frontend deployment.

---

## 7. Rollback & Disaster Recovery Procedures

### Application Rollback
To rollback an application release to the previous known good task definition:
```bash
aws ecs update-service \
  --cluster conflux-cluster-production \
  --service conflux-api-service-production \
  --task-definition conflux-api-production:<PREVIOUS_REVISION_NUMBER>

aws ecs update-service \
  --cluster conflux-cluster-production \
  --service conflux-worker-service-production \
  --task-definition conflux-worker-production:<PREVIOUS_REVISION_NUMBER>
```

### Database Point-in-Time Recovery (PITR)
RDS PostgreSQL is configured with automated daily snapshots and 7-day backup retention.
To restore the database to a specific point in time:
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier conflux-postgres-production \
  --target-db-instance-identifier conflux-postgres-restored \
  --restore-time 2026-10-15T12:00:00Z \
  --db-subnet-group-name conflux-db-subnet-group-production
```

### Rotating Secrets
1. Update values in AWS Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value --secret-id conflux/production/secrets --secret-string '...'
   ```
2. Trigger an ECS rolling restart to load the updated secrets:
   ```bash
   aws ecs update-service --cluster conflux-cluster-production --service conflux-api-service-production --force-new-deployment
   aws ecs update-service --cluster conflux-cluster-production --service conflux-worker-service-production --force-new-deployment
   ```
