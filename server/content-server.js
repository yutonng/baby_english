const http = require("node:http");
const { createHash, randomUUID } = require("node:crypto");
const { access, mkdir, readFile, rename, stat, writeFile } = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(rootDir, "server", "uploads");
const draftsPath = path.join(dataDir, "scenes.drafts.json");
const publishedPath = path.join(dataDir, "scenes.published.json");
const port = Number(process.env.PORT || 4180);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function ensureFiles() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(uploadDir, { recursive: true });
  await ensureJsonFile(draftsPath, []);
  await ensureJsonFile(publishedPath, []);
}

async function ensureJsonFile(filePath, fallback) {
  try {
    await access(filePath);
  } catch {
    await writeJson(filePath, fallback);
  }
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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message, details) {
  sendJson(res, statusCode, { error: message, details });
}

function collectJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableId(value) {
  const slug = slugify(value);
  if (slug) return slug;
  return createHash("sha1").update(String(value || randomUUID())).digest("hex").slice(0, 10);
}

function normalizeColors(colors) {
  const fallback = ["#ffe3a3", "#bfe7ff"];
  if (!Array.isArray(colors) || colors.length < 2) return fallback;
  return colors.slice(0, 2).map((color, index) => String(color || fallback[index]));
}

function normalizeImage(image, sceneId, word, index) {
  const imageObject = typeof image === "string" ? { url: image } : image || {};
  const storageKey = imageObject.storageKey || imageObject.key || "";
  const url = imageObject.url || imageObject.imageUrl || imageObject.path || "";
  const version = Number(imageObject.version || 1);
  const status = imageObject.status || (url || storageKey ? "ready" : "pending");

  return {
    status,
    storageKey,
    url,
    prompt: imageObject.prompt || imageObject.imagePrompt || defaultImagePrompt(sceneId, word),
    version: Number.isFinite(version) && version > 0 ? version : 1,
    width: imageObject.width || null,
    height: imageObject.height || null,
    updatedAt: imageObject.updatedAt || new Date().toISOString(),
    candidateName: imageObject.candidateName || `${stableId(word || index)}-v${Number.isFinite(version) ? version : 1}.png`,
  };
}

function defaultImagePrompt(sceneId, word) {
  return [
    "Use case: illustration-story",
    "Asset type: child learning word sticker",
    `Primary request: ${word || "object"} for the ${sceneId || "scene"} scene`,
    "Style/medium: cute polished bitmap sticker for preschool English learning",
    "Composition/framing: single centered subject, square, generous padding",
    "Constraints: no text, no watermark, friendly and simple, suitable for a 4-year-old child",
  ].join("\n");
}

function normalizeWord(word, sceneId, index) {
  const english = String(word.word || "").trim();
  return {
    word: english,
    cn: String(word.cn || "").trim(),
    picture: String(word.picture || "").trim(),
    sentence: String(word.sentence || "").trim(),
    image: normalizeImage(word.image || word.imageMeta, sceneId, english, index),
  };
}

function normalizeScene(input, currentStatus = "draft") {
  const title = String(input.title || "").trim();
  const subtitle = String(input.subtitle || "").trim();
  const id = stableId(input.id || subtitle || title || randomUUID());
  const words = Array.isArray(input.words) ? input.words.map((word, index) => normalizeWord(word, id, index)) : [];

  return {
    id,
    title,
    subtitle,
    icon: String(input.icon || "📘").trim(),
    colors: normalizeColors(input.colors),
    status: input.status || currentStatus,
    words,
    notes: input.notes || "",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function validateScene(scene, { requireReadyImages = false } = {}) {
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

    if (requireReadyImages) {
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
      image: word.image.url || `/uploads/${word.image.storageKey}`,
      imageVersion: word.image.version,
    })),
  };
}

async function imageFileExists(image) {
  if (!image?.storageKey) return Boolean(image?.url);
  const filePath = path.join(uploadDir, image.storageKey);
  if (!filePath.startsWith(uploadDir)) return false;
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

async function validateSceneAssets(scene) {
  const missing = [];
  for (const word of scene.words || []) {
    if (!(await imageFileExists(word.image))) {
      missing.push(word.word);
    }
  }
  return missing;
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/content") {
    const [drafts, published] = await Promise.all([
      readJson(draftsPath, []),
      readJson(publishedPath, []),
    ]);
    sendJson(res, 200, { drafts, published });
    return;
  }

  if (req.method === "GET" && pathname === "/api/scenes/drafts") {
    sendJson(res, 200, await readJson(draftsPath, []));
    return;
  }

  if (req.method === "GET" && pathname === "/api/scenes/published") {
    sendJson(res, 200, await readJson(publishedPath, []));
    return;
  }

  if (req.method === "POST" && pathname === "/api/scenes/drafts") {
    const body = await collectJson(req);
    const drafts = await readJson(draftsPath, []);
    const scene = normalizeScene(body.scene || body, "draft");
    const errors = validateScene(scene);
    if (errors.length) {
      sendError(res, 422, "场景草稿校验失败", errors);
      return;
    }
    if (drafts.some((item) => item.id === scene.id)) {
      sendError(res, 409, `草稿 id 已存在：${scene.id}`);
      return;
    }
    drafts.push(scene);
    await writeJson(draftsPath, drafts);
    sendJson(res, 201, scene);
    return;
  }

  const draftMatch = pathname.match(/^\/api\/scenes\/drafts\/([^/]+)$/);
  if (draftMatch && req.method === "PUT") {
    const sceneId = decodeURIComponent(draftMatch[1]);
    const body = await collectJson(req);
    const drafts = await readJson(draftsPath, []);
    const index = drafts.findIndex((item) => item.id === sceneId);
    if (index === -1) {
      sendError(res, 404, `找不到草稿：${sceneId}`);
      return;
    }
    const scene = normalizeScene({ ...body.scene || body, id: sceneId, createdAt: drafts[index].createdAt }, drafts[index].status);
    const errors = validateScene(scene);
    if (errors.length) {
      sendError(res, 422, "场景草稿校验失败", errors);
      return;
    }
    drafts[index] = scene;
    await writeJson(draftsPath, drafts);
    sendJson(res, 200, scene);
    return;
  }

  const approveMatch = pathname.match(/^\/api\/scenes\/drafts\/([^/]+)\/approve$/);
  if (approveMatch && req.method === "POST") {
    const sceneId = decodeURIComponent(approveMatch[1]);
    const drafts = await readJson(draftsPath, []);
    const draftIndex = drafts.findIndex((item) => item.id === sceneId);
    if (draftIndex === -1) {
      sendError(res, 404, `找不到草稿：${sceneId}`);
      return;
    }

    const publishedAt = new Date().toISOString();
    const scene = { ...drafts[draftIndex], status: "approved", updatedAt: publishedAt, publishedAt };
    const errors = validateScene(scene, { requireReadyImages: true });
    const missingAssets = await validateSceneAssets(scene);
    if (errors.length || missingAssets.length) {
      sendError(res, 422, "审核通过失败", {
        errors,
        missingAssets,
      });
      return;
    }

    const published = await readJson(publishedPath, []);
    const publishedScene = toPublishedScene(scene);
    const existingIndex = published.findIndex((item) => item.id === scene.id);
    if (existingIndex >= 0) {
      published.splice(existingIndex, 1);
    }
    published.unshift(publishedScene);

    drafts[draftIndex] = { ...scene, status: "published", publishedAt };
    await Promise.all([writeJson(draftsPath, drafts), writeJson(publishedPath, published)]);
    sendJson(res, 200, { draft: drafts[draftIndex], published: publishedScene });
    return;
  }

  const imageMatch = pathname.match(/^\/api\/scenes\/drafts\/([^/]+)\/words\/([^/]+)\/image$/);
  if (imageMatch && req.method === "PUT") {
    const sceneId = decodeURIComponent(imageMatch[1]);
    const wordIndex = Number(decodeURIComponent(imageMatch[2]));
    const body = await collectJson(req);
    const drafts = await readJson(draftsPath, []);
    const scene = drafts.find((item) => item.id === sceneId);
    if (!scene || !scene.words[wordIndex]) {
      sendError(res, 404, "找不到对应场景或单词");
      return;
    }
    scene.words[wordIndex].image = normalizeImage(body.image || body, sceneId, scene.words[wordIndex].word, wordIndex);
    scene.updatedAt = new Date().toISOString();
    await writeJson(draftsPath, drafts);
    sendJson(res, 200, scene.words[wordIndex]);
    return;
  }

  sendError(res, 404, "Unknown API route");
}

async function serveStatic(req, res, pathname) {
  if (pathname.startsWith("/server/") || (pathname.startsWith("/data/") && pathname !== "/data/scenes.published.json")) {
    sendError(res, 404, "Not found");
    return;
  }

  let filePath = pathname === "/" ? path.join(rootDir, "index.html") : path.join(rootDir, pathname);
  if (pathname === "/admin") filePath = path.join(rootDir, "admin.html");
  if (pathname.startsWith("/uploads/")) {
    filePath = path.join(uploadDir, pathname.replace(/^\/uploads\//, ""));
  }

  const staticRoot = pathname.startsWith("/uploads/") ? uploadDir : rootDir;
  const normalizedRoot = `${staticRoot}${path.sep}`;
  const normalizedFile = path.normalize(filePath);
  if (!normalizedFile.startsWith(normalizedRoot)) {
    sendError(res, 403, "Forbidden");
    return;
  }

  try {
    const info = await stat(normalizedFile);
    if (!info.isFile()) {
      sendError(res, 404, "Not found");
      return;
    }
    const ext = path.extname(normalizedFile);
    res.writeHead(200, {
      "content-type": contentTypes[ext] || "application/octet-stream",
      "cache-control": pathname.startsWith("/data/") ? "no-store" : "public, max-age=60",
    });
    createReadStream(normalizedFile).pipe(res);
  } catch {
    sendError(res, 404, "Not found");
  }
}

async function route(req, res) {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }
    await serveStatic(req, res, pathname);
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

ensureFiles()
  .then(() => {
    http.createServer(route).listen(port, () => {
      console.log(`Content server running at http://localhost:${port}`);
      console.log(`Review admin running at http://localhost:${port}/admin`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
