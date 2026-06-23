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

REMOTE_SCRIPT=$(base64 -w0 <<'REMOTE'
set -euxo pipefail

APP_SOURCE_BRANCH="$1"

if [ -x /usr/local/bin/snake-royale-redeploy ]; then
	/usr/local/bin/snake-royale-redeploy "$APP_SOURCE_BRANCH"
	exit 0
fi

APP_DIR=/opt/snake-royale
git -C "$APP_DIR" fetch --prune origin
git -C "$APP_DIR" checkout "$APP_SOURCE_BRANCH"
git -C "$APP_DIR" pull --ff-only origin "$APP_SOURCE_BRANCH"

DATABASE_URL=$(docker inspect snake-royale --format '{{range .Config.Env}}{{println .}}{{end}}' | awk -F= '$1=="SNAKE_ROYALE_DATABASE_URL"{print substr($0, index($0,"=")+1)}')

docker build -t snake-royale "$APP_DIR"
docker rm -f snake-royale || true
docker run \
	--detach \
	--name snake-royale \
	--restart unless-stopped \
	--publish 80:8000 \
	--env SNAKE_ROYALE_DATABASE_URL="$DATABASE_URL" \
	snake-royale
REMOTE
)

PARAMETERS_FILE=$(mktemp)
trap 'rm -f "$PARAMETERS_FILE"' EXIT

cat >"$PARAMETERS_FILE" <<JSON
{
  "commands": [
    "printf '%s' '$REMOTE_SCRIPT' | base64 -d >/tmp/snake-royale-update.sh",
    "bash /tmp/snake-royale-update.sh '$APP_SOURCE_BRANCH'"
  ]
}
JSON

COMMAND_ID=$(aws ssm send-command \
	--region "$AWS_REGION" \
	--instance-ids "$INSTANCE_ID" \
	--document-name AWS-RunShellScript \
	--comment "Redeploy Snake Royale" \
	--parameters "file://$PARAMETERS_FILE" \
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
