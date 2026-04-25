/**
 * Seeds DynamoDB products and stock tables with sample rows.
 *
 * Usage (after deploy — copy table names from stack outputs or CloudFormation):
 *   export AWS_REGION=eu-west-1
 *   export PRODUCTS_TABLE_NAME=...
 *   export STOCK_TABLE_NAME=...
 *   cd cdk && npm run seed:dynamodb
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const productsTable = process.env.PRODUCTS_TABLE_NAME;
const stockTable = process.env.STOCK_TABLE_NAME;

if (!productsTable || !stockTable) {
  console.error(
    "Set PRODUCTS_TABLE_NAME and STOCK_TABLE_NAME environment variables.",
  );
  process.exit(1);
}

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const samples: {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}[] = [
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    title: "ProductOne",
    description: "Short Product Description1",
    price: 24,
    count: 3,
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
    title: "ProductTitle",
    description: "Short Product Description7",
    price: 15,
    count: 5,
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3",
    title: "Product",
    description: "Short Product Description2",
    price: 23,
    count: 2,
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73348a80a1",
    title: "ProductTest",
    description: "Short Product Description4",
    price: 15,
    count: 7,
  },
  {
    id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2",
    title: "Product2",
    description: "Short Product Descriptio1",
    price: 23,
    count: 1,
  },
  {
    id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
    title: "ProductName",
    description: "Short Product Description7",
    price: 15,
    count: 4,
  },
];

async function main() {
  for (const row of samples) {
    const { count, ...product } = row;
    await doc.send(
      new PutCommand({
        TableName: productsTable,
        Item: product,
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: stockTable,
        Item: { product_id: product.id, count },
      }),
    );
    console.log("Seeded product", product.id, product.title);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
