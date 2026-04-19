#!/bin/bash

# Deploy script for My Store App
# This script builds the React app, uploads to S3, and invalidates CloudFront cache

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   My Store App Deployment Script    ${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials are not configured. Please run 'aws configure'.${NC}"
    exit 1
fi

# Get stack outputs
echo -e "${YELLOW}Fetching CDK stack outputs...${NC}"
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name MyStoreAppStack --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text 2>/dev/null)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name MyStoreAppStack --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text 2>/dev/null)
WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name MyStoreAppStack --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text 2>/dev/null)

if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" == "None" ]; then
    echo -e "${RED}Error: Could not find S3 bucket. Make sure the CDK stack is deployed.${NC}"
    echo -e "${YELLOW}Run 'npm run cdk:deploy' first to deploy the infrastructure.${NC}"
    exit 1
fi

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
    echo -e "${RED}Error: Could not find CloudFront distribution. Make sure the CDK stack is deployed.${NC}"
    exit 1
fi

echo -e "${GREEN}S3 Bucket: ${BUCKET_NAME}${NC}"
echo -e "${GREEN}CloudFront Distribution: ${DISTRIBUTION_ID}${NC}"

# Step 1: Build the React app
echo -e "\n${YELLOW}Step 1: Building React application...${NC}"
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - 'dist' directory not found.${NC}"
    exit 1
fi

# Step 2: Sync files to S3
echo -e "\n${YELLOW}Step 2: Uploading files to S3...${NC}"
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete

echo -e "${GREEN}Files uploaded successfully!${NC}"

# Step 3: Invalidate CloudFront cache
echo -e "\n${YELLOW}Step 3: Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*" --query "Invalidation.Id" --output text)

echo -e "${GREEN}CloudFront invalidation created: ${INVALIDATION_ID}${NC}"
echo -e "${YELLOW}Note: Cache invalidation may take a few minutes to complete.${NC}"

# Final output
echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}   Deployment Complete!              ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Website URL: ${WEBSITE_URL}${NC}"
echo -e "${YELLOW}It may take a few minutes for changes to propagate worldwide.${NC}"
