const { collectJson, requireAdmin, sendError, sendJson } = require("../_content");
const { runMigration } = require("../../scripts/migrate-vercel-blob-to-r2");

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
    const result = await runMigration({ apply: Boolean(body.apply) });
    sendJson(res, 200, result);
  } catch (error) {
    sendError(res, 500, error.message || "R2 迁移失败");
  }
};
