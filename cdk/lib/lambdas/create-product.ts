import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { getDocumentClient, requireEnv } from "./dynamo";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

type CreateBody = {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  count?: unknown;
};

function parseBody(raw: string | null): CreateBody {
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as CreateBody;
  } catch {
    return {};
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  console.log("CreateProduct event:", event);

  try {
    const productsTable = requireEnv("PRODUCTS_TABLE_NAME");
    const stockTable = requireEnv("STOCK_TABLE_NAME");
    const body = parseBody(event.body);

    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;
    if (!title) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "title is required" }),
      };
    }

    const description =
      typeof body.description === "string" ? body.description : "";
    const priceRaw = body.price;
    const price =
      typeof priceRaw === "number" && Number.isInteger(priceRaw) && priceRaw >= 0
        ? priceRaw
        : typeof priceRaw === "string" && /^\d+$/.test(priceRaw)
          ? parseInt(priceRaw, 10)
          : NaN;
    if (Number.isNaN(price)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "price is required and must be a non-negative integer",
        }),
      };
    }

    let count = 0;
    if (body.count !== undefined && body.count !== null) {
      const c =
        typeof body.count === "number"
          ? body.count
          : typeof body.count === "string" && /^\d+$/.test(body.count)
            ? parseInt(body.count, 10)
            : NaN;
      if (Number.isNaN(c) || !Number.isInteger(c) || c < 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "count must be a non-negative integer when provided",
          }),
        };
      }
      count = c;
    }

    const id = randomUUID();
    const doc = getDocumentClient();

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

    const created = { id, title, description, price, count };
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(created),
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
