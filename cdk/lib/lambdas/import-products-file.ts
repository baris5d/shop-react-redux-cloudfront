import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const s3Client = new S3Client({});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getFileName(event: APIGatewayProxyEvent): string | null {
  const rawFileName =
    event.queryStringParameters?.name ??
    event.queryStringParameters?.fileName;
  if (!rawFileName) {
    return null;
  }

  const decodedFileName = decodeURIComponent(rawFileName).trim();
  const normalizedFileName = decodedFileName.replace(/^.*[\\/]/, "");

  return normalizedFileName || null;
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const fileName = getFileName(event);
    if (!fileName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Query parameter 'name' is required" }),
      };
    }

    const bucketName = requireEnv("IMPORT_BUCKET_NAME");
    const key = `uploaded/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: "text/csv",
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ signedUrl }),
    };
  } catch (error) {
    console.error("Failed to create signed URL", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}