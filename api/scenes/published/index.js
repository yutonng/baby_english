const { readPublished, sendJson } = require("../../_content");

function getSceneTime(scene) {
  return Date.parse(scene.publishedAt || scene.updatedAt || scene.createdAt || "") || 0;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const scenes = (await readPublished()).sort((a, b) => getSceneTime(b) - getSceneTime(a));
  sendJson(res, 200, scenes, "public, s-maxage=60, stale-while-revalidate=300");
};
