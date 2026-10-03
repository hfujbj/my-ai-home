const { body, send } = require("./_lib");

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) throw new Error("API 地址必须以 http:// 或 https:// 开头");
  return raw.replace(/\/+$/, "");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "只支持 POST" });
  try {
    const data = await body(req);
    const url = normalizeUrl(data.url);
    const key = String(data.key || "").trim();
    if (!key) return send(res, 400, { error: "没有填写 API 密钥" });
    const endpoint = /\/models$/i.test(url) ? url : url + "/models";
    const upstream = await fetch(endpoint, {
      headers: { Authorization: "Bearer " + key, Accept: "application/json" }
    });
    const raw = await upstream.text();
    let json;
    try { json = JSON.parse(raw); } catch (e) { json = { error: raw.slice(0, 1200) }; }
    if (!upstream.ok) return send(res, upstream.status, {
      error: (json.error && (json.error.message || json.error)) || json.message || "拉取模型失败",
      upstream: true,
      status: upstream.status
    });
    const ids = (json.data || json.models || []).map(function (m) {
      return m && (m.id || m.name) || m;
    }).filter(Boolean);
    return send(res, 200, { models: ids });
  } catch (e) {
    return send(res, 500, { error: e && e.message || "拉取模型失败" });
  }
};
