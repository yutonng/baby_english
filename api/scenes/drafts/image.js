const {
  collectJson,
  readDrafts,
  requireAdmin,
  sendError,
  sendJson,
  writeDrafts,
} = require("../../_content");

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
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await collectJson(req);
  const drafts = await readDrafts();
  const scene = drafts.find((item) => item.id === body.sceneId);
  const wordIndex = Number(body.wordIndex);
  if (!scene || !scene.words[wordIndex]) {
    sendError(res, 404, "找不到对应场景或单词");
    return;
  }

  scene.words[wordIndex].image = normalizeImage(body.image);
  scene.updatedAt = new Date().toISOString();
  await writeDrafts(drafts);
  sendJson(res, 200, scene.words[wordIndex]);
};
