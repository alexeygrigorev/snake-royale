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
	--no-fail-on-empty-changeset \
	--parameter-overrides \
		AppRepositoryUrl="$APP_REPOSITORY_URL" \
		AppSourceBranch="$APP_SOURCE_BRANCH" \
		AuroraEngineVersion="$AURORA_ENGINE_VERSION"

aws cloudformation describe-stacks \
	--stack-name "$STACK_NAME" \
	--region "$AWS_REGION" \
	--query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" \
	--output text
