#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImportServiceStack } from "../lib/import-service-stack";
import { ProductServiceStack } from "../lib/product-service-stack";

const app = new cdk.App();

new ProductServiceStack(app, "ProductServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-1",
  },
  description: "Product service stack",
});

new ImportServiceStack(app, "ImportServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-1",
  },
  description: "Import service stack for CSV product uploads",
});
