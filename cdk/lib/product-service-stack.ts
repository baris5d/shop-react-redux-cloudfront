import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "path";
import { Construct } from "constructs";

export class ProductServiceStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly api: apigateway.RestApi;
  public readonly catalogItemsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for hosting the React app
    this.bucket = new s3.Bucket(this, "ProductServiceBucket", {
      bucketName: `epm-s3-frontend-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Allows bucket deletion with `cdk destroy`
      autoDeleteObjects: true, // Automatically delete objects when bucket is destroyed
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
    });

    // Create Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "ProductServiceOAI",
      {
        comment: "OAI for Product Service CloudFront distribution",
      },
    );

    // Grant CloudFront access to the S3 bucket
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId,
          ),
        ],
      }),
    );

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(
      this,
      "ProductServiceDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(this.bucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: "index.html",
        httpVersion: cloudfront.HttpVersion.HTTP2,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        // Handle SPA routing - return index.html for 404 errors
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
        ],
      },
    );

    // Outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "S3 Bucket Name",
      exportName: "ProductServiceBucketName",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront Distribution ID",
      exportName: "ProductServiceDistributionId",
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront Distribution Domain Name",
      exportName: "ProductServiceDistributionDomainName",
    });

    new cdk.CfnOutput(this, "WebsiteURL", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "Website URL",
      exportName: "ProductServiceWebsiteURL",
    });

    // ========== DynamoDB (products + stock) ==========

    const productsTable = new dynamodb.Table(this, "ProductsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stockTable = new dynamodb.Table(this, "StockTable", {
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dynamoEnv = {
      PRODUCTS_TABLE_NAME: productsTable.tableName,
      STOCK_TABLE_NAME: stockTable.tableName,
    };

    // ========== API Gateway + Lambda Functions ==========

    // Create API Gateway
    this.api = new apigateway.RestApi(this, "ProductServiceAPI", {
      restApiName: "Product Service API",
      description: "API for product management",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // Lambda for getProductsList
    const getProductsListLambda = new lambdaNodejs.NodejsFunction(
      this,
      "GetProductsListFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "lambdas/get-products-list.ts"),
        handler: "handler",
        environment: dynamoEnv,
        bundling: {
          minify: false,
          target: "es2020",
        },
      },
    );

    // Lambda for getProductsById
    const getProductsByIdLambda = new lambdaNodejs.NodejsFunction(
      this,
      "GetProductsByIdFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "lambdas/get-products-by-id.ts"),
        handler: "handler",
        environment: dynamoEnv,
        bundling: {
          minify: false,
          target: "es2020",
        },
      },
    );

    const createProductLambda = new lambdaNodejs.NodejsFunction(
      this,
      "CreateProductFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "lambdas/create-product.ts"),
        handler: "handler",
        environment: dynamoEnv,
        bundling: {
          minify: false,
          target: "es2020",
        },
      },
    );

    this.catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: `catalog-items-queue-${this.account}-${this.region}`,
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    const createProductTopic = new sns.Topic(this, "CreateProductTopic", {
      topicName: `create-product-topic-${this.account}-${this.region}`,
      displayName: "Create product notifications",
    });

    const notificationEmailParam = new cdk.CfnParameter(
      this,
      "ProductNotificationsEmail",
      {
        type: "String",
        description: "Email endpoint for createProductTopic subscription",
      },
    );

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription(notificationEmailParam.valueAsString),
    );

    const catalogBatchProcessLambda = new lambdaNodejs.NodejsFunction(
      this,
      "CatalogBatchProcessFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "lambdas/catalogBatchProcess.ts"),
        handler: "catalogBatchProcess",
        environment: {
          ...dynamoEnv,
          CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
        },
        bundling: {
          minify: false,
          target: "es2020",
        },
      },
    );

    productsTable.grantReadData(getProductsListLambda);
    stockTable.grantReadData(getProductsListLambda);
    productsTable.grantReadData(getProductsByIdLambda);
    stockTable.grantReadData(getProductsByIdLambda);
    productsTable.grantWriteData(createProductLambda);
    stockTable.grantWriteData(createProductLambda);
    productsTable.grantWriteData(catalogBatchProcessLambda);
    stockTable.grantWriteData(catalogBatchProcessLambda);
    this.catalogItemsQueue.grantConsumeMessages(catalogBatchProcessLambda);
    createProductTopic.grantPublish(catalogBatchProcessLambda);

    catalogBatchProcessLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(this.catalogItemsQueue, {
        batchSize: 5,
      }),
    );

    // API resources and methods
    const productsResource = this.api.root.addResource("products");

    // GET /products
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsListLambda),
    );

    // POST /products
    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProductLambda),
    );

    // GET /products/{productId}
    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsByIdLambda),
    );

    // API Output
    new cdk.CfnOutput(this, "APIEndpoint", {
      value: this.api.url,
      description: "API Gateway Endpoint URL",
      exportName: "ProductServiceAPIEndpoint",
    });

    new cdk.CfnOutput(this, "ProductsEndpoint", {
      value: `${this.api.url}products`,
      description: "Products List Endpoint",
      exportName: "ProductsListEndpoint",
    });

    new cdk.CfnOutput(this, "ProductsTableName", {
      value: productsTable.tableName,
      description: "DynamoDB products table (for seed script)",
    });

    new cdk.CfnOutput(this, "StockTableName", {
      value: stockTable.tableName,
      description: "DynamoDB stock table (for seed script)",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueUrl", {
      value: this.catalogItemsQueue.queueUrl,
      description: "SQS queue URL used by import parser",
    });

    new cdk.CfnOutput(this, "CreateProductTopicArn", {
      value: createProductTopic.topicArn,
      description: "SNS topic ARN for product creation notifications",
    });
  }
}
