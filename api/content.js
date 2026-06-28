const { readDrafts, readPublished, requireAdmin, sendJson } = require("./_content");

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const [drafts, published] = await Promise.all([readDrafts(), readPublished()]);
  sendJson(res, 200, { drafts, published });
};
