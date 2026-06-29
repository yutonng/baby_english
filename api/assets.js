const path = require("node:path");
const { get } = require("@vercel/blob");

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.CONTENT_BLOB_READ_WRITE_TOKEN || "";
}

function getContentType(key) {
  const ext = path.extname(key || "").toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
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

  const token = getBlobToken();
  if (!token) {
    sendError(res, 500, "服务端缺少 Blob 读取 Token");
    return;
  }

  const key = String(req.query.key || "").trim();
  if (!key || key.includes("..") || !key.startsWith("scenes/")) {
    sendError(res, 400, "图片 key 不合法");
    return;
  }

  const blob = await get(key, { access: "private", token });
  if (!blob || !blob.stream) {
    sendError(res, 404, "找不到图片");
    return;
  }

  res.statusCode = 200;
  res.setHeader("content-type", getContentType(key));
  res.setHeader("cache-control", "public, max-age=31536000, immutable");
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const arrayBuffer = await new Response(blob.stream).arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
};
