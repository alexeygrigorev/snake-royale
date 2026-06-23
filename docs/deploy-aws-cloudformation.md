# Deploy to AWS with CloudFormation

This template creates:

- Aurora PostgreSQL Serverless v2
- a Secrets Manager secret containing the database username and password
- a single Amazon Linux EC2 instance that clones this repository, builds the Docker image, reads the secret at boot, and runs the app container
- an Elastic IP output used as the public app URL

## Create the stack

Deploy from the repository root with the helper script:

```bash
./scripts/aws-deploy.sh
```

Or run the equivalent AWS CLI command directly:

```bash
aws cloudformation deploy \
  --stack-name snake-royale \
  --region us-east-1 \
  --template-file infra/cloudformation.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    AppRepositoryUrl=https://github.com/alexeygrigorev/snake-royale \
    AppSourceBranch=main \
    AuroraEngineVersion=16.6
```

Then read the public app URL:

```bash
aws cloudformation describe-stacks \
  --stack-name snake-royale \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" \
  --output text
```

## Update the stack

Commit and push the app changes first. The EC2 instance clones the Git
repository, so local-only changes are not available to the deployment.

Then run the update helper:

```bash
./scripts/aws-update.sh
```

The update helper applies CloudFormation changes, then uses AWS Systems Manager
to run the EC2 instance's `/usr/local/bin/snake-royale-redeploy` command. That
command pulls the configured branch, rebuilds the Docker image, and restarts the
container.

Or run the stack update command directly:

```bash
aws cloudformation deploy \
  --stack-name snake-royale \
  --region us-east-1 \
  --template-file infra/cloudformation.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    AppRepositoryUrl=https://github.com/alexeygrigorev/snake-royale \
    AppSourceBranch=main \
    AuroraEngineVersion=16.6
```

The generated database secret has no rotation schedule, so re-running these
commands with the same template and parameters does not rotate the password.

## Delete the stack

Delete the stack when you no longer need the deployment:

```bash
aws cloudformation delete-stack \
  --stack-name snake-royale \
  --region us-east-1
```

Wait for deletion to finish:

```bash
aws cloudformation wait stack-delete-complete \
  --stack-name snake-royale \
  --region us-east-1
```

Deleting the stack deletes the EC2 instance, Elastic IP, Aurora cluster, and
Secrets Manager secret. Export or snapshot any database data you need before
deleting the stack.

## Notes

The generated database secret has no rotation schedule. Re-running the deploy
command with the same template and parameters updates the stack without rotating
the password.

Aurora Serverless v2 requires a compatible Aurora PostgreSQL engine version in
the target region. If `16.6` is not available in your region, pass a supported
version with `AuroraEngineVersion`.
