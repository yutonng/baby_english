const {
  collectJson,
  normalizeScene,
  readDrafts,
  requireAdmin,
  sendError,
  sendJson,
  validateScene,
  writeDrafts,
} = require("../../_content");

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    sendJson(res, 200, await readDrafts());
    return;
  }

  if (req.method === "POST") {
    const body = await collectJson(req);
    const drafts = await readDrafts();
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
    await writeDrafts(drafts);
    sendJson(res, 201, scene);
    return;
  }

  res.setHeader("allow", "GET, POST");
  sendJson(res, 405, { error: "Method not allowed" });
};
