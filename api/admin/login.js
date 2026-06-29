const { collectJson, createAdminSession, sendError, sendJson, verifyAdminLogin } = require("../_content");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await collectJson(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!verifyAdminLogin(username, password)) {
    sendError(res, 401, "账号或密码不正确");
    return;
  }

  sendJson(res, 200, {
    token: createAdminSession(username),
    username,
  });
};
