# Deploy to AWS with CloudFormation

This template creates:

- Aurora PostgreSQL Serverless v2
- a Secrets Manager secret containing the database username and password
- a single Amazon Linux EC2 instance that clones this repository, builds the Docker image, reads the secret at boot, and runs the app container
- a CloudFront distribution used as the public HTTPS app URL
- an Elastic IP output for direct EC2 HTTP access

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
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    AppRepositoryUrl=https://github.com/alexeygrigorev/snake-royale \
    AppSourceBranch=main \
    AuroraEngineVersion=16.6 \
    GitHubRepository=alexeygrigorev/snake-royale \
    GitHubOidcProviderArn=arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com
```

Then read the public app URL:

```bash
aws cloudformation describe-stacks \
  --stack-name snake-royale \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" \
  --output text
```

The template also creates a GitHub Actions OIDC deploy role. Store the
`GitHubDeployRoleArn` stack output as the repository Actions secret named
`AWS_ROLE_TO_ASSUME`. GitHub Actions will assume that role through OIDC; do not
create an IAM user or long-lived AWS access keys for deployment.

The `AppUrl` output is the HTTPS CloudFront URL. The `AppHttpUrl` output is the
direct EC2 URL and is useful only for debugging.

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
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    AppRepositoryUrl=https://github.com/alexeygrigorev/snake-royale \
    AppSourceBranch=main \
    AuroraEngineVersion=16.6 \
    GitHubRepository=alexeygrigorev/snake-royale \
    GitHubOidcProviderArn=arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com
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

Deleting the stack deletes the CloudFront distribution, EC2 instance, Elastic
IP, Aurora cluster, and Secrets Manager secret. Export or snapshot any database
data you need before deleting the stack. CloudFront distribution deletion can
take several minutes.

## Notes

The generated database secret has no rotation schedule. Re-running the deploy
command with the same template and parameters updates the stack without rotating
the password.

Aurora Serverless v2 requires a compatible Aurora PostgreSQL engine version in
the target region. If `16.6` is not available in your region, pass a supported
version with `AuroraEngineVersion`.
