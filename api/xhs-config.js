// 小红书开放平台配置探测：只返回前端需要的公开授权地址，不暴露 app_secret。
const { send } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "GET") return send(res, 405, { error: "只支持 GET" });
  const authorizeUrl = process.env.XHS_AUTHORIZE_URL || "";
  send(res, 200, {
    enabled: Boolean(authorizeUrl && process.env.XHS_APP_ID),
    authorizeUrl,
    configured: Boolean(process.env.XHS_APP_ID && process.env.XHS_APP_SECRET && authorizeUrl)
  });
};
