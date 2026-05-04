import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { BatchGetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { chunk, getDocumentClient, requireEnv } from "./dynamo";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

type ProductRow = {
  id: string;
  title: string;
  description?: string;
  price: number;
};

type StockRow = {
  product_id: string;
  count: number;
};

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  console.log("GetProductsList event:", event);

  try {
    const productsTable = requireEnv("PRODUCTS_TABLE_NAME");
    const stockTable = requireEnv("STOCK_TABLE_NAME");
    const doc = getDocumentClient();

    const scan = await doc.send(
      new ScanCommand({ TableName: productsTable }),
    );
    const products = (scan.Items ?? []) as ProductRow[];
    const ids = products.map((p) => p.id).filter(Boolean);
    const stockByProductId = new Map<string, number>();

    for (const keyBatch of chunk(ids, 100)) {
      if (keyBatch.length === 0) {
        continue;
      }
      const res = await doc.send(
        new BatchGetCommand({
          RequestItems: {
            [stockTable]: {
              Keys: keyBatch.map((product_id) => ({ product_id })),
            },
          },
        }),
      );
      const rows = (res.Responses?.[stockTable] ?? []) as StockRow[];
      for (const row of rows) {
        stockByProductId.set(row.product_id, row.count ?? 0);
      }
    }

    const joined = products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      price: p.price,
      count: stockByProductId.get(p.id) ?? 0,
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(joined),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}
