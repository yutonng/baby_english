const path = require("node:path");
const { put } = require("@vercel/blob");
const {
  collectJson,
  readDrafts,
  requireAdmin,
  sendError,
  sendJson,
  writeDrafts,
} = require("../../_content");

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.CONTENT_BLOB_READ_WRITE_TOKEN || "";
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getExtension(contentType, fileName) {
  const ext = path.extname(fileName || "").toLowerCase();
  if ([".webp", ".png", ".jpg", ".jpeg"].includes(ext)) return ext;
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/jpeg") return ".jpg";
  return "";
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const token = getBlobToken();
  if (!token) {
    sendError(res, 500, "服务端缺少 Blob 写入 Token");
    return;
  }

  const body = await collectJson(req);
  const sceneId = String(body.sceneId || "").trim();
  const wordName = String(body.word || "").trim();
  const wordIndexInput = body.wordIndex;
  const contentType = String(body.contentType || "image/webp").trim();
  const dataBase64 = String(body.dataBase64 || "").trim();

  if (!sceneId) {
    sendError(res, 400, "缺少 sceneId");
    return;
  }
  if (!dataBase64) {
    sendError(res, 400, "缺少图片数据");
    return;
  }
  if (!/^image\/(webp|png|jpeg)$/.test(contentType)) {
    sendError(res, 400, "不支持的图片格式");
    return;
  }

  const drafts = await readDrafts();
  const scene = drafts.find((item) => item.id === sceneId);
  if (!scene) {
    sendError(res, 404, `找不到草稿：${sceneId}`);
    return;
  }

  const wordIndex =
    wordIndexInput === undefined
      ? scene.words.findIndex((item) => String(item.word || "").toLowerCase() === wordName.toLowerCase())
      : Number(wordIndexInput);
  const word = scene.words[wordIndex];
  if (!word) {
    sendError(res, 404, "找不到对应单词");
    return;
  }

  const currentImage = word.image || {};
  const currentVersion = Number(currentImage.version || 1);
  const nextVersion = currentImage.status === "ready" ? currentVersion + 1 : currentVersion;
  const ext = getExtension(contentType, body.fileName);
  if (!ext) {
    sendError(res, 400, "无法识别图片扩展名");
    return;
  }

  const imageBuffer = Buffer.from(dataBase64, "base64");
  const maxBytes = 1024 * 1024;
  if (!imageBuffer.length || imageBuffer.length > maxBytes) {
    sendError(res, 400, "图片大小不合法");
    return;
  }

  const storageKey = path.posix.join(
    "scenes",
    slugify(sceneId),
    "words",
    `${slugify(word.word)}-v${nextVersion}${ext}`
  );
  const blob = await put(storageKey, imageBuffer, {
    access: "private",
    allowOverwrite: true,
    contentType,
    token,
  });
  const imageUrl = `/api/assets?key=${encodeURIComponent(storageKey)}&v=${nextVersion}`;

  word.image = {
    status: "ready",
    storageKey,
    url: imageUrl,
    prompt: body.prompt || currentImage.prompt || "",
    version: nextVersion,
    width: body.width || null,
    height: body.height || null,
    updatedAt: new Date().toISOString(),
  };
  scene.updatedAt = new Date().toISOString();

  await writeDrafts(drafts);
  sendJson(res, 200, word);
};
