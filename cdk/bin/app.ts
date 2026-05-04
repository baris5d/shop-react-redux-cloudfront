#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImportServiceStack } from "../lib/import-service-stack";
import { MyStoreAppStack } from "../lib/my-store-app-stack";

const app = new cdk.App();

new MyStoreAppStack(app, "MyStoreAppStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-1",
  },
  description: "My Store App - S3 and CloudFront distribution for React SPA",
});

new ImportServiceStack(app, "ImportServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-1",
  },
  description: "Import service stack for CSV product uploads",
});
