import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDocumentClient, requireEnv } from "./dynamo";

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
  console.log("GetProductsById event:", event);

  try {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "productId is required" }),
      };
    }

    const productsTable = requireEnv("PRODUCTS_TABLE_NAME");
    const stockTable = requireEnv("STOCK_TABLE_NAME");
    const doc = getDocumentClient();

    const productRes = await doc.send(
      new GetCommand({
        TableName: productsTable,
        Key: { id: productId },
      }),
    );
    const product = productRes.Item as ProductRow | undefined;

    if (!product?.id) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Product not found" }),
      };
    }

    const stockRes = await doc.send(
      new GetCommand({
        TableName: stockTable,
        Key: { product_id: productId },
      }),
    );
    const stock = stockRes.Item as StockRow | undefined;
    const count = stock?.count ?? 0;

    const joined = {
      id: product.id,
      title: product.title,
      description: product.description ?? "",
      price: product.price,
      count,
    };

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
