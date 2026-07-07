const { readFile, stat } = require("node:fs/promises");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const sceneDraftsDir = path.join(rootDir, "scene-drafts");
const apiBase = (process.env.CONTENT_API_BASE || "https://babyeng.nihaoya.cloud").replace(/\/$/, "");

function readArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    apply: args.has("--apply"),
    dryRun: !args.has("--apply"),
    rewriteOnly: args.has("--rewrite-only"),
  };
}

function parseEnv(filePath) {
  const out = {};
  try {
    const text = require("node:fs").readFileSync(filePath, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
  } catch {
    return out;
  }
  return out;
}

function getContentType(filePath) {
  const ext = path.extname(filePath || "").toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function slugWithoutVersion(fileName) {
  const ext = path.extname(fileName);
  return path.basename(fileName, ext).replace(/-v\d+$/i, "");
}

function isImageAssetKey(value) {
  return /^scenes\/[^/]+\/words\/[^/]+\.(webp|png|jpe?g|svg)$/i.test(value || "");
}

function getSceneWordFromKey(key) {
  const match = String(key || "").match(/^scenes\/([^/]+)\/words\/([^/]+?)(?:-v\d+)?\.(?:webp|png|jpe?g|svg)$/i);
  return {
    sceneId: match?.[1] || "",
    word: match?.[2] || "",
  };
}

function getApiAssetKey(value) {
  if (!value || typeof value !== "string" || !value.includes("/api/assets")) return "";
  const url = new URL(value, "https://babyeng.local");
  const key = url.searchParams.get("key") || "";
  return isImageAssetKey(key) ? key : "";
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function walkFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkFiles(filePath));
      } else {
        files.push(filePath);
      }
    }
  } catch {
    return files;
  }
  return files;
}

function collectImageKeys(value, keys = new Set()) {
  if (!value) return keys;

  if (typeof value === "string") {
    const key = getApiAssetKey(value) || (isImageAssetKey(value) ? value : "");
    if (key) keys.add(key);
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectImageKeys(item, keys);
    return keys;
  }

  if (typeof value === "object") {
    if (isImageAssetKey(value.storageKey)) keys.add(value.storageKey);
    for (const item of Object.values(value)) collectImageKeys(item, keys);
  }

  return keys;
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

async function resolveLocalImage(key) {
  const match = key.match(/^scenes\/([^/]+)\/words\/([^/]+?)(-v\d+)?\.(webp|png|jpe?g|svg)$/i);
  if (!match) return "";

  const [, sceneId, rawName, versionSuffix, ext] = match;
  const baseName = rawName;
  const targetExt = ext.toLowerCase();
  const candidates = [
    path.join(rootDir, "server", "uploads", key),
    path.join(sceneDraftsDir, sceneId, "images", `${baseName}.${targetExt}`),
    path.join(sceneDraftsDir, sceneId, "images-generated", `${baseName}.${targetExt}`),
    path.join(sceneDraftsDir, sceneId, "generated", `${baseName}.${targetExt}`),
    path.join(sceneDraftsDir, sceneId, "generated", `${baseName}.png`),
    path.join(sceneDraftsDir, sceneId, "generated", `${baseName}.webp`),
    path.join(sceneDraftsDir, sceneId, "images", `${baseName}.webp`),
    path.join(sceneDraftsDir, sceneId, "images-generated", `${baseName}.webp`),
    path.join(rootDir, "assets", "words", "sticker", `${baseName}.svg`),
  ];

  if (versionSuffix) {
    candidates.unshift(
      path.join(sceneDraftsDir, sceneId, "images", `${baseName}${versionSuffix}.${targetExt}`),
      path.join(sceneDraftsDir, sceneId, "images-generated", `${baseName}${versionSuffix}.${targetExt}`),
      path.join(sceneDraftsDir, sceneId, "generated", `${baseName}${versionSuffix}.${targetExt}`)
    );
  }

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  return "";
}

async function collectLocalSceneDraftImages() {
  const items = new Map();
  const uploadResultFiles = walkFiles(sceneDraftsDir).filter((filePath) =>
    /\/upload-results(?:-generated)?\/images\/.+\.json$/i.test(filePath)
  );

  for (const filePath of uploadResultFiles) {
    const value = readJsonIfExists(filePath);
    const key = value?.storageKey || "";
    if (!isImageAssetKey(key)) continue;
    const localPath = await resolveLocalImage(key);
    if (localPath) items.set(key, localPath);
  }

  for (const filePath of walkFiles(sceneDraftsDir)) {
    if (!/\.(webp|png|jpe?g)$/i.test(filePath)) continue;
    if (/contact[-\w]*\.(webp|png|jpe?g)$/i.test(path.basename(filePath))) continue;

    const relative = path.relative(sceneDraftsDir, filePath);
    const parts = relative.split(path.sep);
    const sceneId = parts[0];
    const bucket = parts[1];
    if (!sceneId || !["images", "images-generated", "generated"].includes(bucket)) continue;

    const stem = slugWithoutVersion(path.basename(filePath));
    const ext = path.extname(filePath).toLowerCase().replace(/^\./, "");
    const key = `scenes/${sceneId}/words/${stem}-v1.${ext === "jpg" || ext === "jpeg" ? "jpg" : ext}`;
    if (isImageAssetKey(key) && !items.has(key)) items.set(key, filePath);
  }

  return [...items.entries()].map(([key, filePath]) => ({ key, filePath })).sort((a, b) => a.key.localeCompare(b.key));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(payload.error || `${response.status}: ${text}`);
  }
  return payload;
}

async function login() {
  const env = {
    ...parseEnv(path.join(rootDir, ".env.production.local")),
    ...process.env,
  };
  const adminToken = env.ADMIN_TOKEN || "";
  if (adminToken) return adminToken;

  const username = env.ADMIN_USERNAME || "";
  const password = env.ADMIN_LOGIN_PASSWORD || env.ADMIN_PASSWORD || "";
  if (!username || !password) throw new Error("Missing ADMIN_TOKEN or ADMIN_USERNAME/ADMIN_LOGIN_PASSWORD");

  const payload = await requestJson(`${apiBase}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return payload.token;
}

async function main() {
  const { dryRun, apply, rewriteOnly } = readArgs();
  const token = await login();
  const localSceneItems = await collectLocalSceneDraftImages();

  if (rewriteOnly) {
    const payload = await requestJson(`${apiBase}/api/admin/migrate-r2`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "rewriteSceneWordImages",
        items: localSceneItems.map((item) => ({
          key: item.key,
          ...getSceneWordFromKey(item.key),
        })),
      }),
    });

    console.log(
      JSON.stringify(
        {
          dryRun: false,
          rewriteOnly: true,
          localSceneImages: localSceneItems.length,
          rewrites: payload.rewrites,
          rewritten: payload.rewritten,
        },
        null,
        2
      )
    );
    return;
  }

  const content = await requestJson(`${apiBase}/api/content`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const keys = [...collectImageKeys(content)].sort();
  const localSceneKeys = new Set(localSceneItems.map((item) => item.key));
  const matched = [];
  const missing = [];

  for (const key of keys) {
    const filePath = await resolveLocalImage(key);
    if (filePath && !filePath.includes(`${path.sep}assets${path.sep}words${path.sep}sticker${path.sep}`)) {
      matched.push({ key, filePath });
    } else {
      missing.push(key);
    }
  }

  const uploadItems = [
    ...localSceneItems,
    ...matched.filter((item) => !localSceneKeys.has(item.key)),
  ];
  const uploaded = [];
  if (apply) {
    for (const item of uploadItems) {
      const payload = await requestJson(`${apiBase}/api/admin/migrate-r2`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "uploadLocalAsset",
          key: item.key,
          ...getSceneWordFromKey(item.key),
          contentType: getContentType(item.filePath),
          dataBase64: await readFile(item.filePath, "base64"),
          rewriteContent: true,
        }),
      });
      uploaded.push({ key: item.key, filePath: path.relative(rootDir, item.filePath), rewrites: payload.rewrites });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        contentImageKeys: keys.length,
        localSceneImages: localSceneItems.map((item) => ({
          key: item.key,
          filePath: path.relative(rootDir, item.filePath),
        })),
        matched: matched.map((item) => ({
          key: item.key,
          filePath: path.relative(rootDir, item.filePath),
        })),
        missing,
        uploaded,
        nextStep: dryRun ? "Run with --apply to upload matched local images." : "Local image upload complete.",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
