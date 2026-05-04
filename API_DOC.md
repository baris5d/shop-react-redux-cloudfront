# API Documentation

This project currently does not expose Swagger/OpenAPI JSON.
This file is the source of truth for backend API behavior.

## Overview

- Product Service Stack
  - API Gateway endpoints for product listing, product detail, and product creation
  - DynamoDB tables: products + stock
- Import Service Stack
  - API Gateway endpoint to generate S3 presigned upload URL
  - S3 event driven parser lambda for uploaded CSV files

## Base URLs

- Product API base URL: output `ProductServiceStack.APIEndpoint`
  - Example format: `https://{api-id}.execute-api.eu-west-1.amazonaws.com/prod/`
- Import API base URL: output `ImportServiceStack.ImportServiceAPIEndpointFF171FCD`
  - Example format: `https://{api-id}.execute-api.eu-west-1.amazonaws.com/prod/`
- Import endpoint (direct): output `ImportServiceStack.ImportApiEndpoint`
  - Deployed example: `https://8ae1xt3c4j.execute-api.eu-west-1.amazonaws.com/prod/import`

## Authentication

- No authentication is currently required on documented endpoints.

## CORS

- CORS is enabled with all origins and all methods for both API Gateways.

## HTTP Endpoints

### 1) Get Products List

- Method: `GET`
- Path: `/products`
- Full URL: `{PRODUCT_API_BASE}/products`
- Lambda: `GetProductsListFunction`

#### Response 200

```json
[
  {
    "id": "f6b18b8f-8f6c-4895-9af7-40295a531f2a",
    "title": "Keyboard",
    "description": "Mechanical keyboard",
    "price": 99,
    "count": 12
  }
]
```

#### Response 500

```json
{
  "error": "Internal Server Error"
}
```

### 2) Get Product By Id

- Method: `GET`
- Path: `/products/{productId}`
- Full URL: `{PRODUCT_API_BASE}/products/{productId}`
- Lambda: `GetProductsByIdFunction`

#### Response 200

```json
{
  "id": "f6b18b8f-8f6c-4895-9af7-40295a531f2a",
  "title": "Keyboard",
  "description": "Mechanical keyboard",
  "price": 99,
  "count": 12
}
```

#### Response 400

```json
{
  "error": "productId is required"
}
```

#### Response 404

```json
{
  "error": "Product not found"
}
```

#### Response 500

```json
{
  "error": "Internal Server Error"
}
```

### 3) Create Product

- Method: `POST`
- Path: `/products`
- Full URL: `{PRODUCT_API_BASE}/products`
- Lambda: `CreateProductFunction`

#### Request Body

```json
{
  "title": "Keyboard",
  "description": "Mechanical keyboard",
  "price": 99,
  "count": 12
}
```

#### Validation Notes

- `title`: required, non-empty string
- `price`: required, non-negative integer
- `count`: optional, if provided must be non-negative integer

#### Response 201

```json
{
  "id": "f6b18b8f-8f6c-4895-9af7-40295a531f2a",
  "title": "Keyboard",
  "description": "Mechanical keyboard",
  "price": 99,
  "count": 12
}
```

#### Response 400

```json
{
  "error": "title is required"
}
```

or

```json
{
  "error": "price is required and must be a non-negative integer"
}
```

or

```json
{
  "error": "count must be a non-negative integer when provided"
}
```

#### Response 500

```json
{
  "error": "Internal Server Error"
}
```

### 4) Get Import Upload URL

- Method: `GET`
- Path: `/import`
- Full URL: `{IMPORT_API_BASE}/import?name={fileName}`
- Lambda: `ImportProductsFileFunction` (handler: `importProductsFile`)

#### Query Parameters

- `name`: required, CSV file name
- `fileName`: optional alternative key supported by handler

#### Behavior

- Generates S3 presigned PUT URL for key: `uploaded/{fileName}`
- URL expiration: 300 seconds

#### Response 200

```json
{
  "signedUrl": "https://epm-import-service-...amazonaws.com/uploaded/products.csv?..."
}
```

#### Response 400

```json
{
  "error": "Query parameter 'name' is required"
}
```

#### Response 500

```json
{
  "error": "Internal Server Error"
}
```

## Event Driven Flow (No Direct HTTP Endpoint)

### Import File Parser

- Lambda: `ImportFileParserFunction` (handler: `importFileParser`)
- Trigger: `s3:ObjectCreated:*`
- Filter prefix: `uploaded/`
- Source bucket: `ImportBucket`

### Parser Behavior

1. Reads uploaded CSV object as stream
2. Parses records using `csv-parser`
3. Logs each parsed row to CloudWatch
4. Moves file from `uploaded/` to `parsed/`
   - Copy to `parsed/{fileName}`
   - Delete from `uploaded/{fileName}`

## Frontend Integration

- Import page calls: `${API_PATHS.import}/import`
- API path mapping file: `src/constants/apiPaths.ts`
- Preferred env var for import service:
  - `VITE_IMPORT_API_ENDPOINT=https://{import-api-id}.execute-api.eu-west-1.amazonaws.com/prod`
- Fallback env var:
  - `VITE_API_ENDPOINT`

## Quick Manual Test

### 1) Get signed URL

```bash
curl "https://8ae1xt3c4j.execute-api.eu-west-1.amazonaws.com/prod/import?name=products.csv"
```

### 2) Upload file with returned signed URL

```bash
curl -X PUT -H "Content-Type: text/csv" --upload-file ./products.csv "{signedUrl}"
```

### 3) Verify move to parsed/

```bash
aws s3 ls s3://epm-import-service-225219021322-eu-west-1/uploaded/
aws s3 ls s3://epm-import-service-225219021322-eu-west-1/parsed/
```

## Notes

- `ProductServiceStack` deployment may fail if bucket name `epm-s3-frontend-{account}-{region}` already exists.
- `ImportServiceStack` is deployable independently and already validated in this environment.
