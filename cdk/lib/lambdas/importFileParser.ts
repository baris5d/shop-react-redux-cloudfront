import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { S3Event, S3Handler } from "aws-lambda";
import { Readable } from "stream";

const csv = require("csv-parser");

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toReadableStream(body: unknown): Readable {
  if (body instanceof Readable) {
    return body;
  }

  throw new Error("S3 object body is not a readable stream");
}

type CsvRecord = {
  title?: string;
  description?: string;
  price?: string;
  count?: string;
};

async function parseCsvStream(stream: Readable): Promise<CsvRecord[]> {
  return await new Promise<CsvRecord[]>((resolve, reject) => {
    const rows: CsvRecord[] = [];
    stream
      .pipe(csv())
      .on("data", (record: CsvRecord) => {
        rows.push(record);
      })
      .on("end", () => resolve(rows))
      .on("error", (error: Error) => reject(error));
  });
}

async function sendRecordsToQueue(records: CsvRecord[]): Promise<void> {
  const queueUrl = requireEnv("CATALOG_ITEMS_QUEUE_URL");

  for (const record of records) {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(record),
      }),
    );
  }
}

async function moveToParsedFolder(bucketName: string, sourceKey: string) {
  const parsedKey = sourceKey.replace(/^uploaded\//, "parsed/");

  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: parsedKey,
    }),
  );

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: sourceKey,
    }),
  );
}

export const importFileParser: S3Handler = async (event: S3Event) => {
  const bucketName = requireEnv("IMPORT_BUCKET_NAME");

  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    if (!key.startsWith("uploaded/") || key.endsWith("/.keep")) {
      continue;
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    const records = await parseCsvStream(toReadableStream(response.Body));
    await sendRecordsToQueue(records);
    await moveToParsedFolder(bucketName, key);
  }
};
