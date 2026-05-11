#!/usr/bin/env node
import "source-map-support/register";
import * as dotenv from "dotenv";
import * as cdk from "aws-cdk-lib";
import { ImportServiceStack } from "../lib/import-service-stack";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";
import { ProductServiceStack } from "../lib/product-service-stack";

const dotenvResult = dotenv.config();
const authorizationCredentials = dotenvResult.parsed ?? {};

const app = new cdk.App();

const productServiceStack = new ProductServiceStack(app, "MyStoreAppStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-1",
  },
  description: "Product service stack",
});

const authorizationServiceStack = new AuthorizationServiceStack(
  app,
  "AuthorizationServiceStack",
  {
    credentials: authorizationCredentials,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || "eu-west-1",
    },
    description: "Authorization service stack",
  },
);

new ImportServiceStack(app, "ImportServiceStack", {
  catalogItemsQueue: productServiceStack.catalogItemsQueue,
  basicAuthorizerFunction: authorizationServiceStack.basicAuthorizerFunction,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-1",
  },
  description: "Import service stack for CSV product uploads",
});
