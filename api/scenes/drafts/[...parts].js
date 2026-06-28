const {
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
} = require("../../_content");

function getParts(req) {
  const value = req.query.parts || [];
  return Array.isArray(value) ? value : [value];
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
    updatedAt: new Date().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const [sceneId, second, third, fourth] = getParts(req);
  if (!sceneId) {
    sendError(res, 404, "找不到草稿");
    return;
  }

  if (req.method === "PUT" && !second) {
    const body = await collectJson(req);
    const drafts = await readDrafts();
    const index = drafts.findIndex((item) => item.id === sceneId);
    if (index === -1) {
      sendError(res, 404, `找不到草稿：${sceneId}`);
      return;
    }

    const scene = normalizeScene({ ...(body.scene || body), id: sceneId, createdAt: drafts[index].createdAt }, drafts[index].status);
    const errors = validateScene(scene);
    if (errors.length) {
      sendError(res, 422, "场景草稿校验失败", errors);
      return;
    }

    drafts[index] = scene;
    await writeDrafts(drafts);
    sendJson(res, 200, scene);
    return;
  }

  if (req.method === "POST" && second === "approve") {
    const drafts = await readDrafts();
    const draftIndex = drafts.findIndex((item) => item.id === sceneId);
    if (draftIndex === -1) {
      sendError(res, 404, `找不到草稿：${sceneId}`);
      return;
    }

    const scene = { ...drafts[draftIndex], status: "approved", updatedAt: new Date().toISOString() };
    const errors = validateScene(scene, { requireReadyImages: true });
    if (errors.length) {
      sendError(res, 422, "审核通过失败", { errors });
      return;
    }

    const published = await readPublished();
    const publishedScene = toPublishedScene(scene);
    const existingIndex = published.findIndex((item) => item.id === scene.id);
    if (existingIndex >= 0) {
      published[existingIndex] = publishedScene;
    } else {
      published.push(publishedScene);
    }

    drafts[draftIndex] = { ...scene, status: "published", publishedAt: new Date().toISOString() };
    await Promise.all([writeDrafts(drafts), writePublished(published)]);
    sendJson(res, 200, { draft: drafts[draftIndex], published: publishedScene });
    return;
  }

  if (req.method === "PUT" && second === "words" && fourth === "image") {
    const wordIndex = Number(third);
    const body = await collectJson(req);
    const drafts = await readDrafts();
    const scene = drafts.find((item) => item.id === sceneId);
    if (!scene || !scene.words[wordIndex]) {
      sendError(res, 404, "找不到对应场景或单词");
      return;
    }

    scene.words[wordIndex].image = normalizeImage(body.image || body);
    scene.updatedAt = new Date().toISOString();
    await writeDrafts(drafts);
    sendJson(res, 200, scene.words[wordIndex]);
    return;
  }

  sendError(res, 404, "Unknown API route");
};
