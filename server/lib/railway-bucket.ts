import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type BucketConfig = {
  bucketName: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type BucketObject = {
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

let bucketConfigCache: BucketConfig | null | undefined;
let bucketClientCache: S3Client | null | undefined;

function normalizeEnvValue(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  const normalized = normalizeEnvValue(value).toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function loadBucketConfig(): BucketConfig | null {
  if (bucketConfigCache !== undefined) {
    return bucketConfigCache;
  }

  const bucketName = normalizeEnvValue(process.env.INSTAME_STYLE_ASSETS_BUCKET_NAME || process.env.BUCKET);
  const endpoint = normalizeEnvValue(process.env.INSTAME_STYLE_ASSETS_BUCKET_ENDPOINT || process.env.ENDPOINT);
  const region = normalizeEnvValue(process.env.INSTAME_STYLE_ASSETS_BUCKET_REGION || process.env.REGION || "auto");
  const accessKeyId = normalizeEnvValue(
    process.env.INSTAME_STYLE_ASSETS_BUCKET_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID,
  );
  const secretAccessKey = normalizeEnvValue(
    process.env.INSTAME_STYLE_ASSETS_BUCKET_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY,
  );

  if (!bucketName || !endpoint || !accessKeyId || !secretAccessKey) {
    bucketConfigCache = null;
    return bucketConfigCache;
  }

  bucketConfigCache = {
    bucketName,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: parseBooleanEnv(process.env.INSTAME_STYLE_ASSETS_BUCKET_FORCE_PATH_STYLE, false),
  };
  return bucketConfigCache;
}

function getBucketClient(): S3Client | null {
  if (bucketClientCache !== undefined) {
    return bucketClientCache;
  }

  const config = loadBucketConfig();
  if (!config) {
    bucketClientCache = null;
    return bucketClientCache;
  }

  bucketClientCache = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return bucketClientCache;
}

function getBucketName(): string | null {
  return loadBucketConfig()?.bucketName || null;
}

function toBucketKey(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function toMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const statusCode = typeof (error as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode === "number"
    ? Number((error as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode)
    : null;
  const name = typeof (error as { name?: unknown }).name === "string" ? (error as { name?: string }).name : "";
  return statusCode === 404 || name === "NoSuchKey" || name === "NotFound";
}

export function isStyleAssetBucketConfigured(): boolean {
  return Boolean(getBucketClient() && getBucketName());
}

export async function getStyleAssetObject(relativePath: string): Promise<BucketObject | null> {
  const client = getBucketClient();
  const bucketName = getBucketName();
  if (!client || !bucketName) {
    return null;
  }

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: toBucketKey(relativePath),
      }),
    );

    const body = response.Body;
    if (!body || typeof body.transformToByteArray !== "function") {
      return null;
    }

    const bytes = await body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: typeof response.ContentType === "string" && response.ContentType.trim()
        ? response.ContentType
        : "application/octet-stream",
      cacheControl: typeof response.CacheControl === "string" ? response.CacheControl : undefined,
    };
  } catch (error) {
    if (toMissingObject(error)) {
      return null;
    }
    throw error;
  }
}

export async function uploadStyleAssetObject(options: {
  relativePath: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  const client = getBucketClient();
  const bucketName = getBucketName();
  if (!client || !bucketName) {
    throw new Error(
      "Style asset bucket is not configured. Set INSTAME_STYLE_ASSETS_BUCKET_* env vars or Railway bucket references.",
    );
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: toBucketKey(options.relativePath),
      Body: options.body,
      ContentType: options.contentType,
      CacheControl: options.cacheControl,
    }),
  );
}
