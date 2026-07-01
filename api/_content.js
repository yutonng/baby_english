const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const { get, put } = require("@vercel/blob");
const { enrichSceneI18n, normalizeI18n } = require("../scripts/i18n-content");

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
  const scenes = hasBlobStorage() ? await readBlobJson(draftsKey, [], draftsPath) : await readLocalJson(draftsPath, []);
  return Array.isArray(scenes) ? scenes.map(enrichSceneI18n) : [];
}

async function writeDrafts(value) {
  if (hasBlobStorage()) return writeBlobJson(draftsKey, value);
  return writeLocalJson(draftsPath, value);
}

async function readPublished() {
  const scenes = hasBlobStorage() ? await readBlobJson(publishedKey, [], publishedPath) : await readLocalJson(publishedPath, []);
  return Array.isArray(scenes) ? scenes.map(enrichSceneI18n) : [];
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

function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function getAdminPassword() {
  return process.env.ADMIN_LOGIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_TOKEN || getAdminPassword();
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signAdminPayload(payload) {
  return crypto.createHmac("sha256", getAdminSessionSecret()).update(payload).digest("base64url");
}

function createAdminSession(username) {
  const payload = base64UrlEncode(
    JSON.stringify({
      username,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
    })
  );
  return `${payload}.${signAdminPayload(payload)}`;
}

function verifyAdminSession(token) {
  if (!token || !token.includes(".") || !getAdminSessionSecret()) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!timingSafeEqualString(signature, signAdminPayload(payload))) return false;

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    return session.exp && session.exp > Date.now();
  } catch {
    return false;
  }
}

function verifyAdminLogin(username, password) {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) return false;
  return timingSafeEqualString(username, getAdminUsername()) && timingSafeEqualString(password, configuredPassword);
}

function requireAdmin(req, res) {
  const configuredToken = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD;
  const configuredPassword = getAdminPassword();
  if (!configuredToken && !configuredPassword) return true;

  const authorization = req.headers.authorization || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (token && token === configuredToken) return true;
  if (verifyAdminSession(token)) return true;

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

function normalizeAudioAsset(audio) {
  if (typeof audio === "string") {
    return {
      status: "ready",
      storageKey: "",
      url: audio,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  const value = audio || {};
  return {
    status: value.status || (value.url || value.storageKey ? "ready" : "pending"),
    storageKey: value.storageKey || "",
    url: value.url || "",
    version: Number(value.version || 1),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function normalizeAudio(audio) {
  const value = audio || {};
  const normalized = {
    word: normalizeAudioAsset(value.word || value.wordAudio),
    sentence: normalizeAudioAsset(value.sentence || value.sentenceAudio),
  };
  for (const language of ["zh-CN", "en-US", "ja-JP"]) {
    if (value[language]) {
      normalized[language] = {
        word: normalizeAudioAsset(value[language].word || value[language].wordAudio),
        sentence: normalizeAudioAsset(value[language].sentence || value[language].sentenceAudio),
      };
    }
  }
  return normalized;
}

function normalizeWord(word) {
  return {
    word: String(word.word || "").trim(),
    cn: String(word.cn || "").trim(),
    picture: String(word.picture || "").trim(),
    sentence: String(word.sentence || "").trim(),
    i18n: normalizeI18n(word.i18n),
    image: normalizeImage(word.image),
    audio: normalizeAudio(word.audio),
  };
}

function normalizeScene(input, status = "draft") {
  const title = String(input.title || "").trim();
  const subtitle = String(input.subtitle || "").trim();
  const id = slugify(input.id || subtitle || title);
  return enrichSceneI18n({
    id,
    title,
    subtitle,
    icon: String(input.icon || "📘").trim(),
    colors: normalizeColors(input.colors),
    status: input.status || status,
    i18n: normalizeI18n(input.i18n),
    words: Array.isArray(input.words) ? input.words.map(normalizeWord) : [],
    notes: input.notes || "",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
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

    if (options.requireReadyAudio) {
      for (const language of ["zh-CN", "en-US", "ja-JP"]) {
        const audio = word.audio?.[language] || {};
        if (audio.word?.status !== "ready") errors.push(`${label} 的 ${language} 单词音频还没有 ready`);
        if (!audio.word?.url && !audio.word?.storageKey) errors.push(`${label} 缺少 ${language} 服务端单词音频地址`);
        if (audio.sentence?.status !== "ready") errors.push(`${label} 的 ${language} 例句音频还没有 ready`);
        if (!audio.sentence?.url && !audio.sentence?.storageKey) errors.push(`${label} 缺少 ${language} 服务端例句音频地址`);
      }
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
    i18n: normalizeI18n(scene.i18n),
    publishedAt: scene.publishedAt || new Date().toISOString(),
    words: scene.words.map((word) => ({
      word: word.word,
      cn: word.cn,
      picture: word.picture,
      sentence: word.sentence,
      i18n: normalizeI18n(word.i18n),
      image: word.image.url || word.image.storageKey,
      imageVersion: word.image.version || 1,
      audio: {
        word: word.audio?.word?.url || word.audio?.word?.storageKey || "",
        sentence: word.audio?.sentence?.url || word.audio?.sentence?.storageKey || "",
        "zh-CN": {
          word: word.audio?.["zh-CN"]?.word?.url || word.audio?.["zh-CN"]?.word?.storageKey || "",
          sentence: word.audio?.["zh-CN"]?.sentence?.url || word.audio?.["zh-CN"]?.sentence?.storageKey || "",
        },
        "en-US": {
          word: word.audio?.["en-US"]?.word?.url || word.audio?.["en-US"]?.word?.storageKey || "",
          sentence: word.audio?.["en-US"]?.sentence?.url || word.audio?.["en-US"]?.sentence?.storageKey || "",
        },
        "ja-JP": {
          word: word.audio?.["ja-JP"]?.word?.url || word.audio?.["ja-JP"]?.word?.storageKey || "",
          sentence: word.audio?.["ja-JP"]?.sentence?.url || word.audio?.["ja-JP"]?.sentence?.storageKey || "",
        },
      },
      audioVersion: Math.max(Number(word.audio?.word?.version || 1), Number(word.audio?.sentence?.version || 1)),
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
  createAdminSession,
  normalizeScene,
  readDrafts,
  readPublished,
  requireAdmin,
  sendError,
  sendJson,
  toPublishedScene,
  validateScene,
  verifyAdminLogin,
  writeDrafts,
  writePublished,
};
