const path = require("node:path");
const {
  collectJson,
  readDrafts,
  readPublished,
  requireAdmin,
  sendError,
  sendJson,
  writeDrafts,
  writePublished,
} = require("../../_content");
const { assertR2UploadConfig, putObject } = require("../../../lib/r2-storage");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function applyAudioItem({ scenes, item, metadataOnly }) {
  const sceneId = String(item.sceneId || "").trim();
  const wordName = String(item.word || "").trim();
  const kind = String(item.kind || "").trim();
  const hasExplicitLanguage = Boolean(item.language);
  const language = String(item.language || "en-US").trim();
  const dataBase64 = String(item.dataBase64 || "").trim();

  if (!sceneId) throw Object.assign(new Error("缺少 sceneId"), { statusCode: 400 });
  if (!["word", "sentence"].includes(kind)) throw Object.assign(new Error("音频 kind 必须是 word 或 sentence"), { statusCode: 400 });
  if (!["zh-CN", "en-US", "ja-JP"].includes(language)) throw Object.assign(new Error("不支持的音频语言"), { statusCode: 400 });
  if (!metadataOnly && !dataBase64) throw Object.assign(new Error("缺少音频数据"), { statusCode: 400 });

  const scene = scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw Object.assign(new Error(`找不到场景：${sceneId}`), { statusCode: 404 });

  const wordIndex =
    item.wordIndex === undefined
      ? scene.words.findIndex((candidate) => String(candidate.word || "").toLowerCase() === wordName.toLowerCase())
      : Number(item.wordIndex);
  const word = scene.words[wordIndex];
  if (!word) throw Object.assign(new Error(`找不到对应单词：${sceneId}/${wordName}`), { statusCode: 404 });

  const audio = word.audio || {};
  const languageAudio = audio[language] || {};
  const current = languageAudio[kind] || {};
  const currentVersion = Number(current.version || 1);
  const nextVersion = Number(item.version || (current.status === "ready" && !metadataOnly ? currentVersion + 1 : currentVersion));
  const maxBytes = 512 * 1024;

  const storageKey = path.posix.join(
    "scenes",
    slugify(sceneId),
    "audio",
    language,
    kind === "word" ? "words" : "sentences",
    `${slugify(word.word)}-v${nextVersion}.mp3`
  );
  let audioUrl = current.url || "";
  if (!metadataOnly) {
    const audioBuffer = Buffer.from(dataBase64, "base64");
    if (!audioBuffer.length || audioBuffer.length > maxBytes) throw Object.assign(new Error("音频大小不合法"), { statusCode: 400 });
    const object = await putObject(storageKey, audioBuffer, {
      contentType: "audio/mpeg",
      cacheControl: "public, max-age=31536000, immutable",
    });
    audioUrl = object.url;
  }
  if (!audioUrl) audioUrl = `/api/assets?key=${encodeURIComponent(storageKey)}&v=${nextVersion}`;
  const updatedAt = new Date().toISOString();

  word.audio = {
    ...audio,
    ...(!hasExplicitLanguage
      ? {
          [kind]: {
            status: "ready",
            storageKey,
            url: audioUrl,
            version: nextVersion,
            updatedAt,
          },
        }
      : {}),
    [language]: {
      ...languageAudio,
      [kind]: {
        status: "ready",
        storageKey,
        url: audioUrl,
        version: nextVersion,
        updatedAt,
      },
    },
  };
  scene.updatedAt = updatedAt;
  return word;
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    assertR2UploadConfig();
  } catch (error) {
    sendError(res, 500, "服务端缺少 R2 写入配置");
    return;
  }

  const body = await collectJson(req);
  const target = String(body.target || "draft").trim();
  const metadataOnly = Boolean(body.metadataOnly);

  if (!["draft", "published"].includes(target)) return sendError(res, 400, "target 必须是 draft 或 published");

  const scenes = target === "published" ? await readPublished() : await readDrafts();
  const items = Array.isArray(body.items) ? body.items : [body];
  const maxItems = metadataOnly ? 2000 : 30;
  if (!items.length || items.length > maxItems) return sendError(res, 400, `items 数量必须在 1 到 ${maxItems} 之间`);

  let lastWord = null;
  try {
    for (const item of items) {
      lastWord = await applyAudioItem({ scenes, item, metadataOnly });
    }
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || "音频上传失败");
  }

  if (target === "published") {
    await writePublished(scenes);
  } else {
    await writeDrafts(scenes);
  }
  if (Array.isArray(body.items)) {
    sendJson(res, 200, { uploaded: items.length });
  } else {
    sendJson(res, 200, lastWord);
  }
};
