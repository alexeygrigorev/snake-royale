# Deploy to AWS with CloudFormation

This template creates:

- Aurora PostgreSQL Serverless v2
- a Secrets Manager secret containing the database username and password
- a single Amazon Linux EC2 instance that clones this repository, builds the Docker image, reads the secret at boot, and runs the app container
- an Elastic IP output used as the public app URL

Deploy from the repository root:

```bash
aws cloudformation deploy \
  --stack-name snake-royale \
  --template-file infra/cloudformation.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    AppRepositoryUrl=https://github.com/YOUR_ORG/snake-royale.git \
    AppSourceBranch=main \
    AuroraEngineVersion=16.6
```

Then read the app URL:

```bash
aws cloudformation describe-stacks \
  --stack-name snake-royale \
  --query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" \
  --output text
```

The generated database secret has no rotation schedule. Re-running the deploy
command with the same template and parameters updates the stack without rotating
the password.

Aurora Serverless v2 requires a compatible Aurora PostgreSQL engine version in
the target region. If `16.6` is not available in your region, pass a supported
version with `AuroraEngineVersion`.
