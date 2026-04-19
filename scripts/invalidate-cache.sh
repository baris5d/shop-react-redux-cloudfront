#!/bin/bash

# Invalidate CloudFront cache only
# Use this when you want to invalidate cache without building/deploying

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Fetching CloudFront distribution ID...${NC}"

DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name MyStoreAppStack --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text 2>/dev/null)

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
    echo -e "${RED}Error: Could not find CloudFront distribution. Make sure the CDK stack is deployed.${NC}"
    exit 1
fi

echo -e "${YELLOW}Invalidating CloudFront cache for distribution: ${DISTRIBUTION_ID}${NC}"

INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*" --query "Invalidation.Id" --output text)

echo -e "${GREEN}CloudFront invalidation created: ${INVALIDATION_ID}${NC}"
echo -e "${YELLOW}Cache invalidation may take a few minutes to complete.${NC}"
