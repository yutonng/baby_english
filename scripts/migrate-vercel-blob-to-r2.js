const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { get: getBlob } = require("@vercel/blob");
const {
  getContentType,
  getPublicUrl,
  hasR2Credentials,
  hasR2PublicBaseUrl,
  putObject,
  writeJsonObject,
} = require("../lib/r2-storage");

const rootDir = path.join(__dirname, "..");
const contentKeys = {
  drafts: "content/scenes.drafts.json",
  published: "content/scenes.published.json",
};
const localSeeds = {
  drafts: path.join(rootDir, "data", "scenes.drafts.json"),
  published: path.join(rootDir, "data", "scenes.published.json"),
};

function readArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    apply: args.has("--apply"),
  };
}

function getLegacyBlobClientOptions() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.CONTENT_BLOB_READ_WRITE_TOKEN || "";
  if (token) return { token };

  const oidcToken = process.env.VERCEL_OIDC_TOKEN || "";
  const storeId = process.env.BLOB_STORE_ID || process.env.CONTENT_BLOB_STORE_ID || "";
  if (oidcToken && storeId) return { oidcToken, storeId };

  return {};
}

function hasLegacyBlobCredentials() {
  return Object.keys(getLegacyBlobClientOptions()).length > 0;
}

function isNotFoundError(error) {
  return (
    error?.status === 404 ||
    error?.statusCode === 404 ||
    error?.$metadata?.httpStatusCode === 404 ||
    /not found|no such key/i.test(error?.message || "")
  );
}

async function bodyToBuffer(body) {
  if (!body) return null;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body.arrayBuffer === "function") return Buffer.from(await body.arrayBuffer());
  if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readLegacyBlobBuffer(ref) {
  const options = getLegacyBlobClientOptions();
  const attempts = /^https?:\/\//i.test(ref) ? [options] : [{ access: "private", ...options }, options];
  let lastError = null;

  for (const blobOptions of attempts) {
    try {
      const result = await getBlob(ref, blobOptions);
      const buffer = await bodyToBuffer(result?.stream || result?.body || result?.Body);
      if (buffer) return buffer;
    } catch (error) {
      lastError = error;
    }
  }

  if (/^https?:\/\//i.test(ref)) {
    const response = await fetch(ref);
    if (!response.ok) {
      throw new Error(`Failed to fetch legacy Blob URL ${ref}: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (lastError) throw lastError;
  return null;
}

async function readLocalJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function readLegacyJson(name, dryRun) {
  const key = contentKeys[name];
  if (hasLegacyBlobCredentials()) {
    try {
      const buffer = await readLegacyBlobBuffer(key);
      if (buffer) return { source: "vercel-blob", value: JSON.parse(buffer.toString("utf8")) };
    } catch (error) {
      if (!dryRun || !isNotFoundError(error)) throw error;
    }
  }

  if (!dryRun) {
    throw new Error(`Missing legacy Blob content: ${key}`);
  }
  return { source: "local-seed", value: await readLocalJson(localSeeds[name], []) };
}

function isAssetKey(value) {
  return /^scenes\/.+\.(webp|png|jpe?g|svg|mp3|m4a)$/i.test(value || "");
}

function getApiAssetKey(value) {
  if (!value || typeof value !== "string" || !value.includes("/api/assets")) return "";
  const url = new URL(value, "https://babyeng.local");
  const key = url.searchParams.get("key") || "";
  return isAssetKey(key) ? key : "";
}

function getVercelBlobKey(value) {
  if (!/^https?:\/\//i.test(value || "")) return "";
  const url = new URL(value);
  if (!/\.blob\.vercel-storage\.com$/i.test(url.hostname)) return "";
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  return isAssetKey(key) ? key : "";
}

function collectAssets(value, assets, unresolved) {
  if (!value) return;

  if (typeof value === "string") {
    const apiKey = getApiAssetKey(value);
    if (apiKey) {
      addAsset(assets, apiKey, apiKey);
      return;
    }

    const blobKey = getVercelBlobKey(value);
    if (blobKey) {
      addAsset(assets, blobKey, value);
      return;
    }

    if (isAssetKey(value)) addAsset(assets, value, value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectAssets(item, assets, unresolved);
    return;
  }

  if (typeof value === "object") {
    const storageKey = isAssetKey(value.storageKey) ? value.storageKey : "";
    if (storageKey) {
      addAsset(assets, storageKey, storageKey);
      if (typeof value.url === "string") addAsset(assets, storageKey, value.url);
    }
    for (const [key, item] of Object.entries(value)) {
      if (storageKey && key === "url") continue;
      collectAssets(item, assets, unresolved);
    }
  }
}

function addAsset(assets, key, sourceRef) {
  if (!assets.has(key)) {
    assets.set(key, { key, sourceRefs: [] });
  }
  const asset = assets.get(key);
  if (sourceRef && !asset.sourceRefs.includes(sourceRef)) asset.sourceRefs.push(sourceRef);
}

function getTargetUrl(key) {
  const url = getPublicUrl(key);
  return url || `R2_PUBLIC_BASE_URL/${key}`;
}

function rewriteAssets(value, stats, fieldName = "") {
  if (!value) return value;

  if (typeof value === "string") {
    if (fieldName === "storageKey") return value;

    const key = getApiAssetKey(value) || getVercelBlobKey(value) || (isAssetKey(value) ? value : "");
    if (!key) return value;

    const nextValue = getTargetUrl(key);
    if (nextValue !== value) stats.rewrites += 1;
    return nextValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => rewriteAssets(item, stats));
  }

  if (typeof value === "object") {
    const storageKey = isAssetKey(value.storageKey) ? value.storageKey : "";
    const nextValue = {};
    for (const [key, item] of Object.entries(value)) {
      if (storageKey && key === "url" && typeof item === "string") {
        const nextItem = getTargetUrl(storageKey);
        if (nextItem !== item) stats.rewrites += 1;
        nextValue[key] = nextItem;
      } else {
        nextValue[key] = rewriteAssets(item, stats, key);
      }
    }
    return nextValue;
  }

  return value;
}

async function copyAsset(asset) {
  const refs = asset.sourceRefs.length ? asset.sourceRefs : [asset.key];
  let lastError = null;

  for (const ref of refs) {
    try {
      const buffer = await readLegacyBlobBuffer(ref);
      if (!buffer) continue;
      await putObject(asset.key, buffer, {
        contentType: getContentType(asset.key),
        cacheControl: "public, max-age=31536000, immutable",
      });
      return { ok: true };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    error: lastError?.message || "missing legacy Blob object",
  };
}

async function runMigration(options = {}) {
  const apply = Boolean(options.apply);
  const dryRun = !apply;
  if (apply && !hasLegacyBlobCredentials()) {
    throw new Error("Missing legacy Blob credentials: CONTENT_BLOB_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN");
  }
  if (apply && !hasR2Credentials()) {
    throw new Error("Missing R2 credentials");
  }
  if (apply && !hasR2PublicBaseUrl()) {
    throw new Error("Missing R2 public URL: R2_PUBLIC_BASE_URL");
  }

  const drafts = await readLegacyJson("drafts", dryRun);
  const published = await readLegacyJson("published", dryRun);
  const assets = new Map();
  const unresolved = [];
  collectAssets(drafts.value, assets, unresolved);
  collectAssets(published.value, assets, unresolved);

  const failures = [];
  let copiedAssets = 0;
  if (apply) {
    for (const asset of assets.values()) {
      const result = await copyAsset(asset);
      if (result.ok) {
        copiedAssets += 1;
      } else {
        failures.push({ key: asset.key, error: result.error });
      }
    }

    if (failures.length) {
      throw new Error(`Failed to copy ${failures.length} assets: ${JSON.stringify(failures.slice(0, 10))}`);
    }
  }

  const rewriteStats = { rewrites: 0 };
  const nextDrafts = rewriteAssets(drafts.value, rewriteStats);
  const nextPublished = rewriteAssets(published.value, rewriteStats);

  if (apply) {
    await writeJsonObject(contentKeys.drafts, nextDrafts);
    await writeJsonObject(contentKeys.published, nextPublished);
  }

  return {
    dryRun,
    contentSource: {
      drafts: drafts.source,
      published: published.source,
    },
    assetCount: assets.size,
    copiedAssets,
    jsonRewrites: rewriteStats.rewrites,
    unresolved: unresolved.length,
    failures,
    nextStep: dryRun ? "Run with --apply after R2 env vars are configured." : "R2 migration complete.",
  };
}

async function main() {
  const result = await runMigration(readArgs());
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  runMigration,
};
