import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { importProductsFile } from "./importProductsFile";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

describe("importProductsFile", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      IMPORT_BUCKET_NAME: "test-import-bucket",
    };
  });

  it("returns signed url when name query param is provided", async () => {
    vi.mocked(getSignedUrl).mockResolvedValue("https://signed-url.example.com");

    const result = await importProductsFile({
      queryStringParameters: { name: "products.csv" },
    } as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      signedUrl: "https://signed-url.example.com",
    });
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when query param name is missing", async () => {
    const result = await importProductsFile({
      queryStringParameters: null,
    } as any);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: "Query parameter 'name' is required",
    });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 500 when signed url generation fails", async () => {
    vi.mocked(getSignedUrl).mockRejectedValue(new Error("S3 unavailable"));

    const result = await importProductsFile({
      queryStringParameters: { name: "products.csv" },
    } as any);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: "Internal Server Error",
    });
  });

  it("accepts fileName as alternative query key", async () => {
    vi.mocked(getSignedUrl).mockResolvedValue("https://signed-url.example.com");

    const result = await importProductsFile({
      queryStringParameters: { fileName: "alternative.csv" },
    } as any);

    expect(result.statusCode).toBe(200);
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
  });
});
