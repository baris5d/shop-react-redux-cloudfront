import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";
import { Construct } from "constructs";

export class ImportServiceStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "ImportBucket", {
      bucketName: `epm-import-service-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      eventBridgeEnabled: false,
    });

    new s3deploy.BucketDeployment(this, "ImportBucketFolders", {
      destinationBucket: this.bucket,
      sources: [s3deploy.Source.data("uploaded/.keep", "")],
      retainOnDelete: false,
    });

    const lambdaEnvironment = {
      IMPORT_BUCKET_NAME: this.bucket.bucketName,
      IMPORT_BUCKET_REGION: this.region,
    };

    const importProductsFileLambda = new lambdaNodejs.NodejsFunction(
      this,
      "ImportProductsFileFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "lambdas/importProductsFile.ts"),
        handler: "importProductsFile",
        environment: lambdaEnvironment,
        bundling: {
          minify: false,
          target: "es2020",
        },
      },
    );

    const importFileParserLambda = new lambdaNodejs.NodejsFunction(
      this,
      "ImportFileParserFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "lambdas/importFileParser.ts"),
        handler: "importFileParser",
        environment: lambdaEnvironment,
        bundling: {
          minify: false,
          target: "es2020",
        },
      },
    );

    this.bucket.grantReadWrite(importProductsFileLambda);
    this.bucket.grantReadWrite(importFileParserLambda);

    importFileParserLambda.addEventSource(
      new lambdaEventSources.S3EventSource(this.bucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [{ prefix: "uploaded/" }],
      }),
    );

    this.api = new apigateway.RestApi(this, "ImportServiceAPI", {
      restApiName: "Import Service API",
      description: "API for product CSV imports",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const importResource = this.api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileLambda),
    );

    new cdk.CfnOutput(this, "ImportBucketName", {
      value: this.bucket.bucketName,
      description: "S3 bucket used for product import files",
      exportName: "ImportServiceBucketName",
    });

    new cdk.CfnOutput(this, "ImportApiEndpoint", {
      value: `${this.api.url}import`,
      description: "Import service endpoint",
      exportName: "ImportServiceApiEndpoint",
    });
  }
}
