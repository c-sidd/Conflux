#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Conflux - Run Database Migrations on AWS ECS Fargate
# ==============================================================================

ENVIRONMENT="${1:-production}"
CLUSTER_NAME="conflux-cluster-${ENVIRONMENT}"
TASK_FAMILY="conflux-api-${ENVIRONMENT}"

echo "==> Fetching latest task definition for ${TASK_FAMILY}..."
TASK_DEF_ARN=$(aws ecs describe-task-definition --task-definition "${TASK_FAMILY}" --query 'taskDefinition.taskDefinitionArn' --output text)

echo "==> Fetching private subnets and security group for cluster..."
SUBNETS=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=conflux-private-*-${ENVIRONMENT}" --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')
SECURITY_GROUP=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=conflux-ecs-sg-${ENVIRONMENT}" --query 'SecurityGroups[0].GroupId' --output text)

if [ -z "$SUBNETS" ] || [ -z "$SECURITY_GROUP" ]; then
  echo "ERROR: Could not resolve private subnets or security group. Ensure CloudFormation stack is deployed."
  exit 1
fi

echo "==> Launching one-off ECS migration task..."
TASK_ARN=$(aws ecs run-task \
  --cluster "${CLUSTER_NAME}" \
  --task-definition "${TASK_DEF_ARN}" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides": [{"name": "conflux-api", "command": ["alembic", "upgrade", "head"]}]}' \
  --query 'tasks[0].taskArn' \
  --output text)

echo "==> Migration task started: ${TASK_ARN}"
echo "==> Waiting for migration task to complete..."

aws ecs wait tasks-stopped --cluster "${CLUSTER_NAME}" --tasks "${TASK_ARN}"

EXIT_CODE=$(aws ecs describe-tasks --cluster "${CLUSTER_NAME}" --tasks "${TASK_ARN}" --query 'tasks[0].containers[0].exitCode' --output text)

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "SUCCESS: Database migrations completed successfully (exit code 0)."
else
  echo "ERROR: Migration task failed with exit code: ${EXIT_CODE}"
  echo "Fetching CloudWatch logs..."
  aws logs tail "/ecs/conflux-${ENVIRONMENT}" --since 5m --filter-pattern "alembic"
  exit 1
fi
