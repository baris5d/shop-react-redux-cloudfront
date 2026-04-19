#!/bin/bash

# Upload to S3 only (no build, no cache invalidation)
# Use this when you've already built the app and just want to upload

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Fetching S3 bucket name...${NC}"

BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name MyStoreAppStack --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text 2>/dev/null)

if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" == "None" ]; then
    echo -e "${RED}Error: Could not find S3 bucket. Make sure the CDK stack is deployed.${NC}"
    exit 1
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: 'dist' directory not found. Run 'npm run build' first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Uploading files to S3 bucket: ${BUCKET_NAME}${NC}"

aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete

echo -e "${GREEN}Files uploaded successfully!${NC}"
echo -e "${YELLOW}Note: You may need to invalidate CloudFront cache to see changes.${NC}"
echo -e "${YELLOW}Run 'npm run invalidate' to invalidate the cache.${NC}"
