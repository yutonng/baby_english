const {
  collectJson,
  readDrafts,
  readPublished,
  requireAdmin,
  sendError,
  sendJson,
  writeDrafts,
  writePublished,
} = require("../_content");
const { getContentType, getPublicUrl, putObject } = require("../../lib/r2-storage");
const { runMigration } = require("../../scripts/migrate-vercel-blob-to-r2");

function isSceneAssetKey(value) {
  return /^scenes\/.+\.(webp|png|jpe?g|svg|mp3|m4a)$/i.test(value || "");
}

function getApiAssetKey(value) {
  if (!value || typeof value !== "string" || !value.includes("/api/assets")) return "";
  const url = new URL(value, "https://babyeng.local");
  const key = url.searchParams.get("key") || "";
  return isSceneAssetKey(key) ? key : "";
}

function rewriteAssetRefs(value, assetKey, publicUrl, stats, fieldName = "") {
  if (!value) return value;
  if (typeof value === "string") {
    if (fieldName === "storageKey") return value;
    const key = getApiAssetKey(value) || (value === assetKey ? assetKey : "");
    if (key !== assetKey) return value;
    if (value !== publicUrl) stats.rewrites += 1;
    return publicUrl;
  }
  if (Array.isArray(value)) return value.map((item) => rewriteAssetRefs(item, assetKey, publicUrl, stats));
  if (typeof value === "object") {
    const storageKey = value.storageKey === assetKey;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      if (storageKey && key === "url" && typeof item === "string") {
        if (item !== publicUrl) stats.rewrites += 1;
        next[key] = publicUrl;
      } else {
        next[key] = rewriteAssetRefs(item, assetKey, publicUrl, stats, key);
      }
    }
    return next;
  }
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

function rewriteSceneWordImage(scenes, { sceneId, wordSlug, publicUrl, storageKey }, stats) {
  if (!sceneId || !wordSlug || !publicUrl) return scenes;

  return scenes.map((scene) => {
    if (scene.id !== sceneId || !Array.isArray(scene.words)) return scene;

    let changed = false;
    const words = scene.words.map((word) => {
      if (slugify(word.word) !== wordSlug) return word;

      if (typeof word.image === "string") {
        if (word.image === publicUrl) return word;
        changed = true;
        stats.rewrites += 1;
        return { ...word, image: publicUrl, imageVersion: 1 };
      }

      const currentImage = word.image || {};
      if (currentImage.url === publicUrl && currentImage.storageKey === storageKey) return word;
      changed = true;
      stats.rewrites += 1;
      return {
        ...word,
        image: {
          ...currentImage,
          status: "ready",
          storageKey,
          url: publicUrl,
          version: Number(currentImage.version || 1),
          updatedAt: new Date().toISOString(),
        },
      };
    });

    return changed ? { ...scene, words, updatedAt: new Date().toISOString() } : scene;
  });
}

function makeSentence(word) {
  const article = /^[aeiou]/i.test(word) ? "an" : "a";
  return `This is ${article} ${word}.`;
}

function makePublishedWord({ word, cn, imageUrl }) {
  return {
    word,
    cn,
    picture: "",
    sentence: makeSentence(word),
    image: imageUrl,
    imageVersion: 1,
    i18n: {
      "zh-CN": {
        word: cn,
        sentence: `这是${cn}。`,
      },
      "en-US": {
        word,
        sentence: makeSentence(word),
      },
      "ja-JP": {
        word,
        sentence: makeSentence(word),
      },
    },
    audio: {
      word: "",
      sentence: "",
      "zh-CN": { word: "", sentence: "" },
      "en-US": { word: "", sentence: "" },
      "ja-JP": { word: "", sentence: "" },
    },
  };
}

function makeSceneTitle(sceneId) {
  return String(sceneId || "")
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function makePublishedScene({ sceneId, sceneTitle }) {
  const subtitle = makeSceneTitle(sceneId);
  return {
    id: sceneId,
    title: sceneTitle || subtitle,
    subtitle,
    icon: "📘",
    colors: ["#ffe3a3", "#bfe7ff"],
    i18n: {
      "zh-CN": { title: sceneTitle || subtitle, subtitle },
      "en-US": { title: subtitle, subtitle },
      "ja-JP": { title: sceneTitle || subtitle, subtitle },
    },
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    words: [],
  };
}

function upsertPublishedWordImage(scenes, { sceneId, sceneTitle, word, cn, imageUrl }, stats) {
  const wordSlug = slugify(word);
  let hasScene = false;
  const sceneList = scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    hasScene = true;
    return scene;
  });
  if (!hasScene) {
    sceneList.push(makePublishedScene({ sceneId, sceneTitle }));
    stats.addedScenes += 1;
  }

  return sceneList.map((scene) => {
    if (scene.id !== sceneId || !Array.isArray(scene.words)) return scene;

    const existing = scene.words.find((item) => slugify(item.word) === wordSlug);
    if (existing) {
      if (existing.image !== imageUrl) {
        existing.image = imageUrl;
        existing.imageVersion = 1;
        stats.updated += 1;
      }
      return { ...scene, updatedAt: new Date().toISOString() };
    }

    stats.added += 1;
    return {
      ...scene,
      updatedAt: new Date().toISOString(),
      words: [...scene.words, makePublishedWord({ word, cn, imageUrl })],
    };
  });
}

function isR2SceneImage(value) {
  const url = typeof value === "string" ? value : value?.url || "";
  return /^https:\/\/assets\.babyeng\.nihaoya\.cloud\/scenes\/[^/]+\/(?:images|words)\/[^/]+\.webp$/i.test(url);
}

function applySentenceRewrites(scenes, replacements, stats) {
  const bySceneWord = new Map(
    replacements.map((item) => [`${String(item.sceneId || "").trim()}::${slugify(item.word)}`, item])
  );

  return scenes.map((scene) => {
    if (!Array.isArray(scene.words)) return scene;
    let sceneChanged = false;
    const words = scene.words.map((word) => {
      const replacement = bySceneWord.get(`${scene.id}::${slugify(word.word)}`);
      if (!replacement) return word;

      const nextI18n = {
        ...(word.i18n || {}),
        ...(replacement.i18n || {}),
      };
      const nextSentence = String(replacement.sentence || replacement.i18n?.["en-US"]?.sentence || word.sentence || "").trim();
      const changed =
        word.sentence !== nextSentence ||
        JSON.stringify(word.i18n || {}) !== JSON.stringify(nextI18n);

      if (!changed) return word;
      sceneChanged = true;
      stats.rewrites += 1;
      return {
        ...word,
        sentence: nextSentence,
        i18n: nextI18n,
      };
    });
    return sceneChanged ? { ...scene, words, updatedAt: new Date().toISOString() } : scene;
  });
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body = {};
  try {
    body = await collectJson(req);
  } catch {
    sendError(res, 400, "请求 JSON 不合法");
    return;
  }

  try {
    if (body.action === "uploadLocalAsset") {
      const key = String(body.key || "").trim();
      const dataBase64 = String(body.dataBase64 || "").trim();
      if (!isSceneAssetKey(key)) return sendError(res, 400, "资源 key 不合法");
      if (!dataBase64) return sendError(res, 400, "缺少资源数据");

      const buffer = Buffer.from(dataBase64, "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) return sendError(res, 400, "资源大小不合法");

      const object = await putObject(key, buffer, {
        contentType: body.contentType || getContentType(key),
        cacheControl: "public, max-age=31536000, immutable",
      });
      const publicUrl = object.url || getPublicUrl(key);
      const stats = { rewrites: 0 };
      if (body.rewriteContent !== false) {
        const sceneMatch = key.match(/^scenes\/([^/]+)\/(?:images|words)\/([^/]+?)(?:-v\d+)?\.(?:webp|png|jpe?g|svg)$/i);
        const sceneId = String(body.sceneId || sceneMatch?.[1] || "").trim();
        const wordSlug = slugify(body.word || sceneMatch?.[2] || "");

        let drafts = rewriteAssetRefs(await readDrafts(), key, publicUrl, stats);
        let published = rewriteAssetRefs(await readPublished(), key, publicUrl, stats);
        drafts = rewriteSceneWordImage(drafts, { sceneId, wordSlug, publicUrl, storageKey: key }, stats);
        published = rewriteSceneWordImage(published, { sceneId, wordSlug, publicUrl, storageKey: key }, stats);
        if (stats.rewrites) await Promise.all([writeDrafts(drafts), writePublished(published)]);
      }
      sendJson(res, 200, { key, url: publicUrl, rewrites: stats.rewrites });
      return;
    }

    if (body.action === "rewriteSceneWordImages") {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length || items.length > 500) return sendError(res, 400, "items 数量必须在 1 到 500 之间");

      const stats = { rewrites: 0 };
      let drafts = await readDrafts();
      let published = await readPublished();
      const rewritten = [];

      for (const item of items) {
        const key = String(item.key || "").trim();
        if (!/^scenes\/[^/]+\/(?:images|words)\/[^/]+\.(webp|png|jpe?g|svg)$/i.test(key)) continue;
        const sceneMatch = key.match(/^scenes\/([^/]+)\/(?:images|words)\/([^/]+?)(?:-v\d+)?\.(?:webp|png|jpe?g|svg)$/i);
        const sceneId = String(item.sceneId || sceneMatch?.[1] || "").trim();
        const wordSlug = slugify(item.word || sceneMatch?.[2] || "");
        const publicUrl = getPublicUrl(key);
        const before = stats.rewrites;
        drafts = rewriteSceneWordImage(drafts, { sceneId, wordSlug, publicUrl, storageKey: key }, stats);
        published = rewriteSceneWordImage(published, { sceneId, wordSlug, publicUrl, storageKey: key }, stats);
        if (stats.rewrites > before) rewritten.push({ key, url: publicUrl });
      }

      if (stats.rewrites) await Promise.all([writeDrafts(drafts), writePublished(published)]);
      sendJson(res, 200, { rewrites: stats.rewrites, rewritten });
      return;
    }

    if (body.action === "upsertPublishedWordImage") {
      const sceneId = String(body.sceneId || "").trim();
      const sceneTitle = String(body.sceneTitle || "").trim();
      const word = String(body.word || "").trim();
      const cn = String(body.cn || "").trim();
      const key = String(body.key || "").trim();
      const dataBase64 = String(body.dataBase64 || "").trim();
      if (!sceneId || !word || !cn) return sendError(res, 400, "缺少 sceneId、word 或 cn");
      if (!/^scenes\/[^/]+\/(?:images|words)\/[^/]+\.(webp|png|jpe?g|svg)$/i.test(key)) return sendError(res, 400, "资源 key 不合法");
      if (!dataBase64) return sendError(res, 400, "缺少资源数据");

      const buffer = Buffer.from(dataBase64, "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) return sendError(res, 400, "资源大小不合法");
      const object = await putObject(key, buffer, {
        contentType: body.contentType || getContentType(key),
        cacheControl: "public, max-age=31536000, immutable",
      });
      const imageUrl = object.url || getPublicUrl(key);
      const stats = { addedScenes: 0, added: 0, updated: 0 };
      const published = upsertPublishedWordImage(await readPublished(), { sceneId, sceneTitle, word, cn, imageUrl }, stats);
      if (stats.added || stats.updated) await writePublished(published);
      sendJson(res, 200, { sceneId, sceneTitle, word, cn, key, url: imageUrl, ...stats });
      return;
    }

    if (body.action === "prunePublishedWordsWithoutR2Images") {
      const targetSceneIds = new Set((Array.isArray(body.sceneIds) ? body.sceneIds : []).map((id) => String(id || "").trim()).filter(Boolean));
      const published = await readPublished();
      const pruned = [];
      const nextPublished = published.map((scene) => {
        if (!Array.isArray(scene.words)) return scene;
        const hasR2Images = scene.words.some((word) => isR2SceneImage(word.image));
        if (!hasR2Images) return scene;
        if (targetSceneIds.size && !targetSceneIds.has(scene.id)) return scene;

        const kept = [];
        for (const word of scene.words) {
          if (isR2SceneImage(word.image)) {
            kept.push(word);
          } else {
            pruned.push({ sceneId: scene.id, word: word.word, cn: word.cn, image: word.image || "" });
          }
        }
        return { ...scene, words: kept, updatedAt: new Date().toISOString() };
      });

      if (pruned.length && body.apply !== false) await writePublished(nextPublished);
      sendJson(res, 200, { applied: body.apply !== false, prunedCount: pruned.length, pruned });
      return;
    }

    if (body.action === "prunePublishedSvgWords") {
      const published = await readPublished();
      const pruned = [];
      const nextPublished = published.map((scene) => {
        if (!Array.isArray(scene.words)) return scene;
        const kept = [];
        for (const word of scene.words) {
          const image = typeof word.image === "string" ? word.image : word.image?.url || "";
          if (/\.svg(?:$|\?)/i.test(image)) {
            pruned.push({ sceneId: scene.id, word: word.word, cn: word.cn, image });
          } else {
            kept.push(word);
          }
        }
        return kept.length === scene.words.length ? scene : { ...scene, words: kept, updatedAt: new Date().toISOString() };
      });

      if (pruned.length && body.apply !== false) await writePublished(nextPublished);
      sendJson(res, 200, { applied: body.apply !== false, prunedCount: pruned.length, pruned });
      return;
    }

    if (body.action === "rewriteSentences") {
      const target = String(body.target || "published").trim();
      const replacements = Array.isArray(body.replacements) ? body.replacements : [];
      if (!["draft", "published", "both"].includes(target)) return sendError(res, 400, "target 必须是 draft、published 或 both");
      if (!replacements.length || replacements.length > 1000) return sendError(res, 400, "replacements 数量必须在 1 到 1000 之间");

      const stats = { rewrites: 0 };
      const changedTargets = [];
      if (target === "published" || target === "both") {
        const published = applySentenceRewrites(await readPublished(), replacements, stats);
        if (stats.rewrites) {
          await writePublished(published);
          changedTargets.push("published");
        }
      }
      if (target === "draft" || target === "both") {
        const before = stats.rewrites;
        const drafts = applySentenceRewrites(await readDrafts(), replacements, stats);
        if (stats.rewrites > before) {
          await writeDrafts(drafts);
          changedTargets.push("draft");
        }
      }
      sendJson(res, 200, { rewrites: stats.rewrites, targets: changedTargets });
      return;
    }

    const result = await runMigration({ apply: Boolean(body.apply) });
    sendJson(res, 200, result);
  } catch (error) {
    sendError(res, 500, error.message || "R2 迁移失败");
  }
};
