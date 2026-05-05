import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("./dynamo", () => ({
  getDocumentClient: () => ({ send: sendMock }),
  requireEnv: (name: string) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  },
}));

vi.mock("@aws-sdk/client-sns", () => {
  class PublishCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  class SNSClient {
    send = sendMock;
  }

  return { SNSClient, PublishCommand };
});

import { catalogBatchProcess } from "./catalogBatchProcess";

describe("catalogBatchProcess", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      PRODUCTS_TABLE_NAME: "products-table",
      STOCK_TABLE_NAME: "stock-table",
      CREATE_PRODUCT_TOPIC_ARN: "arn:aws:sns:eu-west-1:123456789012:create-product-topic",
    };
  });

  it("creates products from SQS records and publishes SNS notification", async () => {
    await catalogBatchProcess({
      Records: [
        {
          body: JSON.stringify({
            title: "Keyboard",
            description: "Mechanical keyboard",
            price: "99",
            count: "3",
          }),
        },
        {
          body: JSON.stringify({
            title: "Mouse",
            description: "Wireless mouse",
            price: 49,
            count: 10,
          }),
        },
      ],
    } as any);

    expect(sendMock).toHaveBeenCalledTimes(5);
  });

  it("skips invalid records and does not publish when nothing is created", async () => {
    await catalogBatchProcess({
      Records: [
        { body: JSON.stringify({ description: "Missing title", price: 99 }) },
        { body: JSON.stringify({ title: "Invalid", price: "abc" }) },
      ],
    } as any);

    expect(sendMock).not.toHaveBeenCalled();
  });
});
