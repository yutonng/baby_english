const {
  collectJson,
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

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await collectJson(req);
  const sceneId = body.sceneId || body.id;
  const drafts = await readDrafts();
  const draftIndex = drafts.findIndex((item) => item.id === sceneId);
  if (draftIndex === -1) {
    sendError(res, 404, `找不到草稿：${sceneId}`);
    return;
  }

  const publishedAt = new Date().toISOString();
  const scene = { ...drafts[draftIndex], status: "approved", updatedAt: publishedAt, publishedAt };
  const errors = validateScene(scene, { requireReadyImages: true, requireReadyAudio: true });
  if (errors.length) {
    sendError(res, 422, "审核通过失败", { errors });
    return;
  }

  const published = await readPublished();
  const publishedScene = toPublishedScene(scene);
  const existingIndex = published.findIndex((item) => item.id === scene.id);
  if (existingIndex >= 0) {
    published.splice(existingIndex, 1);
  }
  published.unshift(publishedScene);

  drafts.splice(draftIndex, 1);
  await Promise.all([writeDrafts(drafts), writePublished(published)]);
  sendJson(res, 200, { draft: null, published: publishedScene });
};
