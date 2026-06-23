#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${STACK_NAME:-snake-royale}"
AWS_REGION="${AWS_REGION:-us-east-1}"
APP_REPOSITORY_URL="${APP_REPOSITORY_URL:-https://github.com/alexeygrigorev/snake-royale}"
APP_SOURCE_BRANCH="${APP_SOURCE_BRANCH:-main}"
AURORA_ENGINE_VERSION="${AURORA_ENGINE_VERSION:-16.6}"

aws cloudformation deploy \
	--stack-name "$STACK_NAME" \
	--region "$AWS_REGION" \
	--template-file infra/cloudformation.yaml \
	--capabilities CAPABILITY_IAM \
	--parameter-overrides \
		AppRepositoryUrl="$APP_REPOSITORY_URL" \
		AppSourceBranch="$APP_SOURCE_BRANCH" \
		AuroraEngineVersion="$AURORA_ENGINE_VERSION"

INSTANCE_ID=$(aws cloudformation describe-stacks \
	--stack-name "$STACK_NAME" \
	--region "$AWS_REGION" \
	--query "Stacks[0].Outputs[?OutputKey=='AppInstanceId'].OutputValue" \
	--output text)

COMMAND_ID=$(aws ssm send-command \
	--region "$AWS_REGION" \
	--instance-ids "$INSTANCE_ID" \
	--document-name AWS-RunShellScript \
	--comment "Redeploy Snake Royale" \
	--parameters "commands=[\"/usr/local/bin/snake-royale-redeploy '$APP_SOURCE_BRANCH'\"]" \
	--query "Command.CommandId" \
	--output text)

aws ssm wait command-executed \
	--region "$AWS_REGION" \
	--command-id "$COMMAND_ID" \
	--instance-id "$INSTANCE_ID"

aws ssm get-command-invocation \
	--region "$AWS_REGION" \
	--command-id "$COMMAND_ID" \
	--instance-id "$INSTANCE_ID" \
	--query "{Status:Status,ResponseCode:ResponseCode,StandardOutput:StandardOutputContent,StandardError:StandardErrorContent}" \
	--output json

aws cloudformation describe-stacks \
	--stack-name "$STACK_NAME" \
	--region "$AWS_REGION" \
	--query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" \
	--output text
