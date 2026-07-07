const path = require("node:path");
const {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");

let client = null;

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getR2Config() {
  return {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    publicBaseUrl: trimSlash(process.env.R2_PUBLIC_BASE_URL || ""),
  };
}

function getMissingR2Credentials() {
  const config = getR2Config();
  return [
    ["R2_ACCOUNT_ID", config.accountId],
    ["R2_ACCESS_KEY_ID", config.accessKeyId],
    ["R2_SECRET_ACCESS_KEY", config.secretAccessKey],
    ["R2_BUCKET", config.bucket],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function hasR2Credentials() {
  return getMissingR2Credentials().length === 0;
}

function hasR2PublicBaseUrl() {
  return Boolean(getR2Config().publicBaseUrl);
}

function assertR2Credentials() {
  const missing = getMissingR2Credentials();
  if (missing.length) {
    throw new Error(`Missing R2 credentials: ${missing.join(", ")}`);
  }
}

function assertR2UploadConfig() {
  assertR2Credentials();
  if (!hasR2PublicBaseUrl()) {
    throw new Error("Missing R2 public URL: R2_PUBLIC_BASE_URL");
  }
}

function getR2Client() {
  assertR2Credentials();
  if (!client) {
    const config = getR2Config();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

function encodeKey(key) {
  return String(key || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getPublicUrl(key) {
  const { publicBaseUrl } = getR2Config();
  if (!publicBaseUrl) return "";
  return `${publicBaseUrl}/${encodeKey(key)}`;
}

function getContentType(key) {
  const ext = path.extname(key || "").toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function isNotFoundError(error) {
  return (
    error?.name === "NoSuchKey" ||
    error?.name === "NotFound" ||
    error?.$metadata?.httpStatusCode === 404 ||
    error?.Code === "NoSuchKey" ||
    /not found|no such key/i.test(error?.message || "")
  );
}

async function bodyToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  if (typeof body.arrayBuffer === "function") {
    return Buffer.from(await body.arrayBuffer());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function headObject(key) {
  const { bucket } = getR2Config();
  try {
    return await getR2Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function readObjectBuffer(key) {
  const { bucket } = getR2Config();
  try {
    const result = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result?.Body) return null;
    return bodyToBuffer(result.Body);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function readObjectText(key) {
  const buffer = await readObjectBuffer(key);
  return buffer ? buffer.toString("utf8") : null;
}

async function readJsonObject(key) {
  const text = await readObjectText(key);
  return text ? JSON.parse(text) : null;
}

async function putObject(key, body, options = {}) {
  const { bucket } = getR2Config();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType || getContentType(key),
      CacheControl: options.cacheControl,
    })
  );
  return {
    key,
    url: getPublicUrl(key),
  };
}

async function writeJsonObject(key, value) {
  return putObject(key, `${JSON.stringify(value, null, 2)}\n`, {
    contentType: "application/json; charset=utf-8",
    cacheControl: "no-store",
  });
}

module.exports = {
  assertR2Credentials,
  assertR2UploadConfig,
  getContentType,
  getMissingR2Credentials,
  getPublicUrl,
  hasR2Credentials,
  hasR2PublicBaseUrl,
  headObject,
  readJsonObject,
  readObjectBuffer,
  readObjectText,
  putObject,
  writeJsonObject,
};
