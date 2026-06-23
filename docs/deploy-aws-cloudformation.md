# Deploy to AWS with CloudFormation

This template creates:

- Aurora PostgreSQL Serverless v2
- a Secrets Manager secret containing the database username and password
- a single Amazon Linux EC2 instance that clones this repository, builds the Docker image, reads the secret at boot, and runs the app container
- an Elastic IP output used as the public app URL

## Create the stack

Deploy from the repository root:

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

Then re-run the same deploy command:

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

CloudFormation updates the stack in place. The generated database secret has no
rotation schedule, so re-running this command with the same template and
parameters does not rotate the password.

If you only changed app code and not the template, CloudFormation might report
`No changes to deploy`. In that case, either replace the EC2 instance manually or
make a deliberate stack parameter/template change that causes the instance user
data to run again.

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
