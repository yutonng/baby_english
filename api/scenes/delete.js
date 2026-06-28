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

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await collectJson(req);
  const sceneId = body.sceneId || body.id;
  const target = body.target || "draft";
  if (!sceneId) {
    sendError(res, 422, "缺少 sceneId");
    return;
  }

  const drafts = await readDrafts();
  const published = await readPublished();
  const nextDrafts = drafts.filter((scene) => scene.id !== sceneId);
  const nextPublished = target === "published" ? published.filter((scene) => scene.id !== sceneId) : published;
  const deletedDraft = nextDrafts.length !== drafts.length;
  const deletedPublished = nextPublished.length !== published.length;

  if (!deletedDraft && !deletedPublished) {
    sendError(res, 404, `找不到场景：${sceneId}`);
    return;
  }

  await Promise.all([writeDrafts(nextDrafts), writePublished(nextPublished)]);
  sendJson(res, 200, {
    sceneId,
    deletedDraft,
    deletedPublished,
  });
};
