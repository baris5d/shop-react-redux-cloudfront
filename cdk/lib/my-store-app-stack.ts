import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class MyStoreAppStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for hosting the React app
    this.bucket = new s3.Bucket(this, "MyStoreAppBucket", {
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
      "MyStoreAppOAI",
      {
        comment: "OAI for My Store App CloudFront distribution",
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
      "MyStoreAppDistribution",
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
      exportName: "MyStoreAppBucketName",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront Distribution ID",
      exportName: "MyStoreAppDistributionId",
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront Distribution Domain Name",
      exportName: "MyStoreAppDistributionDomainName",
    });

    new cdk.CfnOutput(this, "WebsiteURL", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "Website URL",
      exportName: "MyStoreAppWebsiteURL",
    });
  }
}
