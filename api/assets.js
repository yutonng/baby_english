const path = require("node:path");
const { getContentType, hasR2Credentials, readObjectBuffer } = require("../lib/r2-storage");

function getFallbackContentType(key) {
  const ext = path.extname(key || "").toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".mp3") return "audio/mpeg";
  return "application/octet-stream";
}

function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify({ error: message }));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("allow", "GET, HEAD");
    sendError(res, 405, "Method not allowed");
    return;
  }

  if (!hasR2Credentials()) {
    sendError(res, 500, "服务端缺少 R2 读取配置");
    return;
  }

  const key = String(req.query.key || "").trim();
  if (!key || key.includes("..") || !key.startsWith("scenes/")) {
    sendError(res, 400, "资源 key 不合法");
    return;
  }

  const buffer = await readObjectBuffer(key);
  if (!buffer) {
    sendError(res, 404, "找不到资源");
    return;
  }

  res.statusCode = 200;
  res.setHeader("content-type", getContentType(key) || getFallbackContentType(key));
  res.setHeader("cache-control", "public, max-age=31536000, immutable");
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(buffer);
};
