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
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await collectJson(req);
  const input = body.scene || body;
  const drafts = await readDrafts();
  const index = drafts.findIndex((item) => item.id === input.id);
  const scene = normalizeScene(
    {
      ...input,
      createdAt: index >= 0 ? drafts[index].createdAt : input.createdAt,
    },
    index >= 0 ? drafts[index].status : "draft"
  );
  const errors = validateScene(scene);
  if (errors.length) {
    sendError(res, 422, "场景草稿校验失败", errors);
    return;
  }

  if (index >= 0) {
    drafts[index] = scene;
  } else {
    drafts.push(scene);
  }

  await writeDrafts(drafts);
  sendJson(res, 200, scene);
};
