const { readFile, stat } = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const rootDir = join(__dirname, "..");
const publishedScenesFile = join(rootDir, "data", "scenes.published.json");
const audioDir = join(rootDir, "audio");
const apiBase = (process.env.CONTENT_API_BASE || "https://babyeng.nihaoya.cloud").replace(/\/$/, "");
let adminToken = process.env.ADMIN_TOKEN || "";
const languages = ["zh-CN", "en-US", "ja-JP"];
const requestTimeoutMs = Number(process.env.AUDIO_UPLOAD_TIMEOUT_MS || 30000);
const batchSize = Number(process.env.AUDIO_UPLOAD_BATCH_SIZE || 20);
const uploadKind = process.env.AUDIO_UPLOAD_KIND || "";

function parseEnv(filePath) {
  const out = {};
  try {
    const text = readFileSync(filePath, "utf8");
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

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 1000;
  } catch {
    return false;
  }
}

async function buildUploadItem({ sceneId, wordIndex, word, language, kind, filePath }) {
  return {
    sceneId,
    wordIndex,
    word,
    language,
    kind: kind === "words" ? "word" : "sentence",
    dataBase64: await readFile(filePath, "base64"),
  };
}

function buildMetadataItem({ sceneId, wordIndex, word, language, kind }) {
  return {
    sceneId,
    wordIndex,
    word,
    language,
    kind: kind === "words" ? "word" : "sentence",
  };
}

async function uploadAudioBatch(tasks) {
  const items = await Promise.all(tasks.map(buildUploadItem));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBase}/api/scenes/drafts/upload-audio`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        target: "published",
        items,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Upload failed ${response.status}: ${text}`);
    }
  } finally {
    clearTimeout(timeout);
  }
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
  if (adminToken) return adminToken;
  const env = {
    ...parseEnv(join(rootDir, ".env.production.local")),
    ...process.env,
  };
  if (env.ADMIN_TOKEN) return env.ADMIN_TOKEN;

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

async function syncAudioMetadata(tasks) {
  const items = tasks.map(buildMetadataItem);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBase}/api/scenes/drafts/upload-audio`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        target: "published",
        metadataOnly: true,
        items,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Audio metadata sync failed ${response.status}: ${text}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function readScenes() {
  if (process.env.CONTENT_API_BASE) {
    const response = await fetch(`${apiBase}/api/scenes/published`);
    if (!response.ok) {
      throw new Error(`Failed to read remote scenes: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }
  return JSON.parse(await readFile(publishedScenesFile, "utf8"));
}

async function main() {
  adminToken = await login();
  const scenes = await readScenes();
  const tasks = [];
  let uploaded = 0;
  let missing = 0;

  for (const scene of scenes) {
    for (const [wordIndex, item] of (scene.words || []).entries()) {
      const concept = slugify(item.word);
      if (!concept) continue;
      for (const language of languages) {
        for (const kind of ["words", "sentences"]) {
          if (uploadKind && kind !== uploadKind) continue;
          const filePath = join(audioDir, language, kind, `${concept}.mp3`);
          if (!(await fileExists(filePath))) {
            missing += 1;
            continue;
          }
          tasks.push({ sceneId: scene.id, wordIndex, word: item.word, language, kind, filePath });
        }
      }
    }
  }

  console.log(`Audio upload tasks ${tasks.length}, missing local files ${missing}.`);

  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = tasks.slice(index, index + batchSize);
    await uploadAudioBatch(batch);
    uploaded += batch.length;
    if (uploaded % 100 === 0 || uploaded === tasks.length) {
      console.log(`Audio upload progress ${uploaded}/${tasks.length}.`);
    }
  }

  console.log("Syncing audio metadata...");
  await syncAudioMetadata(tasks);

  console.log(`Audio upload complete. Uploaded ${uploaded}, missing ${missing}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
