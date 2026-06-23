#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${STACK_NAME:-snake-royale}"
AWS_REGION="${AWS_REGION:-us-east-1}"
APP_REPOSITORY_URL="${APP_REPOSITORY_URL:-https://github.com/alexeygrigorev/snake-royale}"
APP_SOURCE_BRANCH="${APP_SOURCE_BRANCH:-main}"
AURORA_ENGINE_VERSION="${AURORA_ENGINE_VERSION:-16.6}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-alexeygrigorev/snake-royale}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
GITHUB_OIDC_PROVIDER_ARN="${GITHUB_OIDC_PROVIDER_ARN:-arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com}"

aws cloudformation deploy \
	--stack-name "$STACK_NAME" \
	--region "$AWS_REGION" \
	--template-file infra/cloudformation.yaml \
	--capabilities CAPABILITY_NAMED_IAM \
	--no-fail-on-empty-changeset \
	--parameter-overrides \
		AppRepositoryUrl="$APP_REPOSITORY_URL" \
		AppSourceBranch="$APP_SOURCE_BRANCH" \
		AuroraEngineVersion="$AURORA_ENGINE_VERSION" \
		GitHubRepository="$GITHUB_REPOSITORY" \
		GitHubOidcProviderArn="$GITHUB_OIDC_PROVIDER_ARN"

aws cloudformation describe-stacks \
	--stack-name "$STACK_NAME" \
	--region "$AWS_REGION" \
	--query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" \
	--output text
