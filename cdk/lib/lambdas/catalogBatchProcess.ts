import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { SQSEvent, SQSRecord } from "aws-lambda";
import { getDocumentClient, requireEnv } from "./dynamo";

type CatalogItemMessage = {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  count?: unknown;
};

const snsClient = new SNSClient({});

function parseInteger(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  return NaN;
}

function parseRecord(record: SQSRecord): CatalogItemMessage {
  try {
    return JSON.parse(record.body) as CatalogItemMessage;
  } catch {
    return {};
  }
}

export async function catalogBatchProcess(event: SQSEvent): Promise<void> {
  const productsTable = requireEnv("PRODUCTS_TABLE_NAME");
  const stockTable = requireEnv("STOCK_TABLE_NAME");
  const topicArn = requireEnv("CREATE_PRODUCT_TOPIC_ARN");
  const doc = getDocumentClient();

  const createdProducts: Array<{ id: string; title: string; price: number; count: number }> = [];

  for (const sqsRecord of event.Records) {
    const payload = parseRecord(sqsRecord);
    const title =
      typeof payload.title === "string" ? payload.title.trim() : undefined;

    if (!title) {
      console.warn("Skipping invalid record without title", sqsRecord.body);
      continue;
    }

    const price = parseInteger(payload.price);
    if (Number.isNaN(price)) {
      console.warn("Skipping invalid record with price", sqsRecord.body);
      continue;
    }

    const parsedCount = parseInteger(payload.count);
    const count = Number.isNaN(parsedCount) ? 0 : parsedCount;
    const description =
      typeof payload.description === "string" ? payload.description : "";

    const id = randomUUID();

    await doc.send(
      new PutCommand({
        TableName: productsTable,
        Item: { id, title, description, price },
      }),
    );

    await doc.send(
      new PutCommand({
        TableName: stockTable,
        Item: { product_id: id, count },
      }),
    );

    createdProducts.push({ id, title, price, count });
  }

  if (createdProducts.length === 0) {
    return;
  }

  await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: "Products created from catalog batch",
      Message: JSON.stringify({
        message: "Products created successfully",
        count: createdProducts.length,
        products: createdProducts,
      }),
    }),
  );
}
