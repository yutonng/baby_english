const { readPublished, sendJson } = require("../../_content");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const scenes = await readPublished();
  sendJson(res, 200, scenes, "public, max-age=60, stale-while-revalidate=300");
};
