const fs = require("node:fs/promises");
const path = require("node:path");
const { get, put } = require("@vercel/blob");

const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const draftsPath = path.join(dataDir, "scenes.drafts.json");
const publishedPath = path.join(dataDir, "scenes.published.json");
const draftsKey = "content/scenes.drafts.json";
const publishedKey = "content/scenes.published.json";

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.CONTENT_BLOB_READ_WRITE_TOKEN || "";
}

function hasBlobStorage() {
  return Boolean(getBlobToken());
}

async function readLocalJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeLocalJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(tmpPath, filePath);
}

async function readBlobJson(key, fallback, seedFilePath) {
  try {
    const result = await get(key, {
      access: "private",
      token: getBlobToken(),
    });
    if (!result || !result.stream) {
      if (seedFilePath) return readLocalJson(seedFilePath, fallback);
      return fallback;
    }
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch (error) {
    if (error.status === 404 || error.statusCode === 404 || /not found/i.test(error.message || "")) {
      if (seedFilePath) return readLocalJson(seedFilePath, fallback);
      return fallback;
    }
    throw error;
  }
}

async function writeBlobJson(key, value) {
  await put(key, JSON.stringify(value, null, 2), {
    access: "private",
    contentType: "application/json; charset=utf-8",
    allowOverwrite: true,
    token: getBlobToken(),
  });
}

async function readDrafts() {
  if (hasBlobStorage()) return readBlobJson(draftsKey, [], draftsPath);
  return readLocalJson(draftsPath, []);
}

async function writeDrafts(value) {
  if (hasBlobStorage()) return writeBlobJson(draftsKey, value);
  return writeLocalJson(draftsPath, value);
}

async function readPublished() {
  if (hasBlobStorage()) return readBlobJson(publishedKey, [], publishedPath);
  return readLocalJson(publishedPath, []);
}

async function writePublished(value) {
  if (hasBlobStorage()) return writeBlobJson(publishedKey, value);
  return writeLocalJson(publishedPath, value);
}

function sendJson(res, statusCode, payload, cacheControl = "no-store") {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", cacheControl);
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, authorization");
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message, details) {
  sendJson(res, statusCode, { error: message, details });
}

function requireAdmin(req, res) {
  const configuredToken = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD;
  if (!configuredToken) return true;

  const authorization = req.headers.authorization || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (token && token === configuredToken) return true;

  sendError(res, 401, "需要管理员授权");
  return false;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeColors(colors) {
  const fallback = ["#ffe3a3", "#bfe7ff"];
  if (!Array.isArray(colors) || colors.length < 2) return fallback;
  return colors.slice(0, 2).map((color, index) => String(color || fallback[index]));
}

function normalizeImage(image) {
  if (typeof image === "string") {
    return {
      status: "ready",
      storageKey: "",
      url: image,
      prompt: "",
      version: 1,
      width: null,
      height: null,
      updatedAt: new Date().toISOString(),
    };
  }

  const value = image || {};
  return {
    status: value.status || (value.url || value.storageKey ? "ready" : "pending"),
    storageKey: value.storageKey || "",
    url: value.url || "",
    prompt: value.prompt || "",
    version: Number(value.version || 1),
    width: value.width || null,
    height: value.height || null,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function normalizeWord(word) {
  return {
    word: String(word.word || "").trim(),
    cn: String(word.cn || "").trim(),
    picture: String(word.picture || "").trim(),
    sentence: String(word.sentence || "").trim(),
    image: normalizeImage(word.image),
  };
}

function normalizeScene(input, status = "draft") {
  const title = String(input.title || "").trim();
  const subtitle = String(input.subtitle || "").trim();
  const id = slugify(input.id || subtitle || title);
  return {
    id,
    title,
    subtitle,
    icon: String(input.icon || "📘").trim(),
    colors: normalizeColors(input.colors),
    status: input.status || status,
    words: Array.isArray(input.words) ? input.words.map(normalizeWord) : [],
    notes: input.notes || "",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function validateScene(scene, options = {}) {
  const errors = [];
  if (!scene.id) errors.push("场景缺少 id");
  if (!scene.title) errors.push("场景缺少中文标题");
  if (!scene.subtitle) errors.push("场景缺少英文标题");
  if (!Array.isArray(scene.words) || scene.words.length === 0) errors.push("场景至少需要一个单词");

  const seenWords = new Set();
  for (const [index, word] of (scene.words || []).entries()) {
    const label = word.word || `第 ${index + 1} 个单词`;
    if (!word.word) errors.push(`${label} 缺少英文单词`);
    if (!word.cn) errors.push(`${label} 缺少中文释义`);
    if (!word.sentence) errors.push(`${label} 缺少例句`);
    const key = String(word.word || "").toLowerCase();
    if (key && seenWords.has(key)) errors.push(`${label} 重复`);
    seenWords.add(key);

    if (options.requireReadyImages) {
      if (word.image?.status !== "ready") errors.push(`${label} 的图片还没有 ready`);
      if (!word.image?.url && !word.image?.storageKey) errors.push(`${label} 缺少服务端图片地址`);
    }
  }

  return errors;
}

function toPublishedScene(scene) {
  return {
    id: scene.id,
    title: scene.title,
    subtitle: scene.subtitle,
    icon: scene.icon,
    colors: scene.colors,
    publishedAt: scene.publishedAt || new Date().toISOString(),
    words: scene.words.map((word) => ({
      word: word.word,
      cn: word.cn,
      picture: word.picture,
      sentence: word.sentence,
      image: word.image.url || word.image.storageKey,
      imageVersion: word.image.version || 1,
    })),
  };
}

async function collectJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  if (!body) return {};
  return JSON.parse(body);
}

module.exports = {
  collectJson,
  normalizeScene,
  readDrafts,
  readPublished,
  requireAdmin,
  sendError,
  sendJson,
  toPublishedScene,
  validateScene,
  writeDrafts,
  writePublished,
};
