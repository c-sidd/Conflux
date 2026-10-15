# ==============================================================================
# Conflux - Run Database Migrations on AWS ECS Fargate (PowerShell)
# ==============================================================================
param (
    [string]$Environment = "production"
)

$ClusterName = "conflux-cluster-$Environment"
$TaskFamily = "conflux-api-$Environment"

Write-Host "==> Fetching latest task definition for $TaskFamily..." -ForegroundColor Cyan
$TaskDefArn = (aws ecs describe-task-definition --task-definition $TaskFamily --query 'taskDefinition.taskDefinitionArn' --output text).Trim()

Write-Host "==> Fetching private subnets and security group for cluster..." -ForegroundColor Cyan
$SubnetList = (aws ec2 describe-subnets --filters "Name=tag:Name,Values=conflux-private-*-$Environment" --query 'Subnets[*].SubnetId' --output text).Trim().Replace("`t", ",")
$SecurityGroup = (aws ec2 describe-security-groups --filters "Name=group-name,Values=conflux-ecs-sg-$Environment" --query 'SecurityGroups[0].GroupId' --output text).Trim()

if (-not $SubnetList -or -not $SecurityGroup) {
    Write-Error "ERROR: Could not resolve private subnets or security group. Ensure CloudFormation stack is deployed."
    exit 1
}

Write-Host "==> Launching one-off ECS migration task..." -ForegroundColor Cyan
$Overrides = '{\"containerOverrides\": [{\"name\": \"conflux-api\", \"command\": [\"alembic\", \"upgrade\", \"head\"]}]}'
$RunOutputJson = (aws ecs run-task `
    --cluster $ClusterName `
    --task-definition $TaskDefArn `
    --launch-type FARGATE `
    --network-configuration "awsvpcConfiguration={subnets=[$SubnetList],securityGroups=[$SecurityGroup],assignPublicIp=DISABLED}" `
    --overrides $Overrides `
    --output json)

$RunOutput = $RunOutputJson | ConvertFrom-Json
$TaskArn = if ($RunOutput.tasks -and $RunOutput.tasks.Count -gt 0) { $RunOutput.tasks[0].taskArn } else { "" }

if (-not $TaskArn) {
    $Failures = if ($RunOutput.failures) { $RunOutput.failures | ConvertTo-Json -Compress } else { "No tasks launched" }
    Write-Host "ERROR: Failed to launch ECS migration task. Failures: $Failures" -ForegroundColor Red
    exit 1
}

Write-Host "==> Migration task started: $TaskArn" -ForegroundColor Cyan
Write-Host "==> Waiting for migration task to complete..." -ForegroundColor Cyan

aws ecs wait tasks-stopped --cluster $ClusterName --tasks $TaskArn

$DescribeOutputJson = (aws ecs describe-tasks --cluster $ClusterName --tasks $TaskArn --output json)
$DescribeOutput = $DescribeOutputJson | ConvertFrom-Json
$Container = $DescribeOutput.tasks[0].containers[0]
$ExitCode = $Container.exitCode

if ($ExitCode -eq 0) {
    Write-Host "SUCCESS: Database migrations completed successfully (exit code 0)." -ForegroundColor Green
} else {
    $StopReason = $DescribeOutput.tasks[0].stoppedReason
    Write-Host "ERROR: Migration task failed with exit code: $ExitCode. Reason: $StopReason" -ForegroundColor Red
    aws logs tail "/ecs/conflux-$Environment" --since 5m --filter-pattern "alembic"
    exit 1
}
