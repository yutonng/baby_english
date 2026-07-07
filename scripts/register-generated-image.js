const { copyFile, mkdir, open, readFile, rename, rm, stat, writeFile } = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const draftsPath = path.join(rootDir, "data", "scenes.drafts.json");
const draftsLockPath = path.join(rootDir, "data", "scenes.drafts.lock");
const uploadDir = path.join(rootDir, "server", "uploads");

const contentApiBase = (process.env.CONTENT_API_BASE || "").replace(/\/$/, "");
const adminToken = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD || "";

function readArgs() {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    const value = process.argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${key || "(end)"}`);
    }
    args.set(key.slice(2), value);
  }
  return args;
}

function required(args, key) {
  const value = args.get(key);
  if (!value) throw new Error(`Missing --${key}`);
  return value;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tmpPath, filePath);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function acquireLock(filePath, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const handle = await open(filePath, "wx");
      await handle.close();
      return async () => {
        await rm(filePath, { force: true });
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      await wait(80);
    }
  }
  throw new Error("Timed out waiting for draft write lock");
}

async function requestRemoteJson(url, options = {}) {
  if (!adminToken) throw new Error("ADMIN_TOKEN is required for remote image registration");

  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${adminToken}`,
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || JSON.stringify(payload));
  }
  return payload;
}

function getImageContentType(filePath) {
  const ext = path.extname(filePath || "").toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  throw new Error(`Unsupported image extension: ${ext || "(none)"}`);
}

async function registerRemoteImage({ sceneId, word, source, prompt, width, height }) {
  const wordResult = await requestRemoteJson(`${contentApiBase}/api/scenes/drafts/upload-image`, {
    method: "POST",
    body: JSON.stringify({
      sceneId,
      word,
      fileName: path.basename(source),
      contentType: getImageContentType(source),
      dataBase64: await readFile(source, "base64"),
      prompt,
      width,
      height,
    }),
  });

  console.log(JSON.stringify(wordResult.image || wordResult, null, 2));
}

async function main() {
  const args = readArgs();
  const sceneId = required(args, "scene");
  const word = required(args, "word");
  const source = path.resolve(required(args, "source"));
  const prompt = args.get("prompt") || "";
  const width = args.get("width") ? Number(args.get("width")) : null;
  const height = args.get("height") ? Number(args.get("height")) : null;

  const sourceInfo = await stat(source);
  if (!sourceInfo.isFile()) throw new Error(`Source is not a file: ${source}`);

  if (contentApiBase) {
    await registerRemoteImage({ sceneId, word, source, prompt, width, height });
    return;
  }

  const releaseLock = await acquireLock(draftsLockPath);
  try {
    const drafts = await readJson(draftsPath, []);
    const scene = drafts.find((item) => item.id === sceneId);
    if (!scene) throw new Error(`Draft scene not found: ${sceneId}`);

    const wordIndex = scene.words.findIndex((item) => item.word.toLowerCase() === word.toLowerCase());
    if (wordIndex === -1) throw new Error(`Word not found in ${sceneId}: ${word}`);

    const currentImage = scene.words[wordIndex].image || {};
    const currentVersion = Number(currentImage.version || 1);
    const nextVersion = currentImage.status === "ready" ? currentVersion + 1 : currentVersion;
    const ext = path.extname(source).toLowerCase() || ".png";
    const storageKey = path.posix.join("scenes", slugify(sceneId), "words", `${slugify(word)}-v${nextVersion}${ext}`);
    const destination = path.join(uploadDir, storageKey);

    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);

    scene.words[wordIndex].image = {
      status: "ready",
      storageKey,
      url: `/uploads/${storageKey}`,
      prompt: prompt || currentImage.prompt || "",
      version: nextVersion,
      width,
      height,
      updatedAt: new Date().toISOString(),
    };
    scene.updatedAt = new Date().toISOString();

    await writeJson(draftsPath, drafts);
    console.log(JSON.stringify(scene.words[wordIndex].image, null, 2));
  } finally {
    await releaseLock();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
