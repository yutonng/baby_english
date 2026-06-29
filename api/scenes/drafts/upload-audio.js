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
  const kind = String(body.kind || "").trim();
  const dataBase64 = String(body.dataBase64 || "").trim();

  if (!sceneId) return sendError(res, 400, "缺少 sceneId");
  if (!["word", "sentence"].includes(kind)) return sendError(res, 400, "音频 kind 必须是 word 或 sentence");
  if (!dataBase64) return sendError(res, 400, "缺少音频数据");

  const drafts = await readDrafts();
  const scene = drafts.find((item) => item.id === sceneId);
  if (!scene) return sendError(res, 404, `找不到草稿：${sceneId}`);

  const wordIndex =
    body.wordIndex === undefined
      ? scene.words.findIndex((item) => String(item.word || "").toLowerCase() === wordName.toLowerCase())
      : Number(body.wordIndex);
  const word = scene.words[wordIndex];
  if (!word) return sendError(res, 404, "找不到对应单词");

  const audio = word.audio || {};
  const current = audio[kind] || {};
  const currentVersion = Number(current.version || 1);
  const nextVersion = current.status === "ready" ? currentVersion + 1 : currentVersion;
  const audioBuffer = Buffer.from(dataBase64, "base64");
  const maxBytes = 512 * 1024;
  if (!audioBuffer.length || audioBuffer.length > maxBytes) return sendError(res, 400, "音频大小不合法");

  const storageKey = path.posix.join(
    "scenes",
    slugify(sceneId),
    "audio",
    kind === "word" ? "words" : "sentences",
    `${slugify(kind === "word" ? word.word : word.sentence)}-v${nextVersion}.mp3`
  );
  await put(storageKey, audioBuffer, {
    access: "private",
    allowOverwrite: true,
    contentType: "audio/mpeg",
    token,
  });
  const audioUrl = `/api/assets?key=${encodeURIComponent(storageKey)}&v=${nextVersion}`;

  word.audio = {
    ...audio,
    [kind]: {
      status: "ready",
      storageKey,
      url: audioUrl,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    },
  };
  scene.updatedAt = new Date().toISOString();

  await writeDrafts(drafts);
  sendJson(res, 200, word);
};
