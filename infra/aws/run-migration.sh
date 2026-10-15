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
RUN_OUTPUT=$(aws ecs run-task \
  --cluster "${CLUSTER_NAME}" \
  --task-definition "${TASK_DEF_ARN}" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides": [{"name": "conflux-api", "command": ["alembic", "upgrade", "head"]}]}' \
  --output json)

TASK_ARN=$(echo "$RUN_OUTPUT" | python3 -c "import sys, json; data=json.load(sys.stdin); tasks=data.get('tasks', []); print(tasks[0]['taskArn'] if tasks else '')")

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
  FAILURES=$(echo "$RUN_OUTPUT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data.get('failures', [])))")
  echo "ERROR: Failed to launch ECS migration task. Failures: ${FAILURES}"
  exit 1
fi

echo "==> Migration task started: ${TASK_ARN}"
echo "==> Waiting for migration task to complete..."

aws ecs wait tasks-stopped --cluster "${CLUSTER_NAME}" --tasks "${TASK_ARN}"

DESCRIBE_TASK=$(aws ecs describe-tasks --cluster "${CLUSTER_NAME}" --tasks "${TASK_ARN}" --output json)
EXIT_CODE=$(echo "$DESCRIBE_TASK" | python3 -c "import sys, json; data=json.load(sys.stdin); containers=data.get('tasks', [{}])[0].get('containers', [{}]); print(containers[0].get('exitCode', -1))")
STOP_REASON=$(echo "$DESCRIBE_TASK" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('tasks', [{}])[0].get('stoppedReason', ''))")

if [ "$EXIT_CODE" = "0" ]; then
  echo "SUCCESS: Database migrations completed successfully (exit code 0)."
else
  echo "ERROR: Migration task failed with exit code: ${EXIT_CODE}. Reason: ${STOP_REASON}"
  echo "Fetching CloudWatch logs..."
  aws logs tail "/ecs/conflux-${ENVIRONMENT}" --since 5m --filter-pattern "alembic" || true
  exit 1
fi
