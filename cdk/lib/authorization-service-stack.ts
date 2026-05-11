import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { Construct } from "constructs";

interface AuthorizationServiceStackProps extends cdk.StackProps {
  credentials: Record<string, string>;
}

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizerFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props: AuthorizationServiceStackProps) {
    super(scope, id, props);

    if (Object.keys(props.credentials).length === 0) {
      throw new Error(
        "Missing authorization credentials. Add at least one entry to cdk/.env (example: your_github_login=TEST_PASSWORD).",
      );
    }

    this.basicAuthorizerFunction = new lambdaNodejs.NodejsFunction(
      this,
      "BasicAuthorizerFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "lambdas/basicAuthorizer.ts"),
        handler: "basicAuthorizer",
        environment: props.credentials,
        bundling: {
          minify: false,
          target: "es2020",
        },
      },
    );

    new cdk.CfnOutput(this, "BasicAuthorizerLambdaName", {
      value: this.basicAuthorizerFunction.functionName,
      description: "Name of the basic authorizer lambda function",
      exportName: "AuthorizationServiceBasicAuthorizerName",
    });
  }
}
