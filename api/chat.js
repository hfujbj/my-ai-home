const { body, send } = require("./_lib");

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) throw new Error("API 地址必须以 http:// 或 https:// 开头");
  return raw.replace(/\/+$/, "");
}

function endpoint(base, path) {
  return /\/chat\/completions$/i.test(base) ? base : base + path;
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(-30).map(function (m) {
    return {
      role: m && ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
      content: typeof (m && m.content) === "string" ? m.content.slice(0, 12000) : String(m && m.content || "").slice(0, 12000)
    };
  }).filter(function (m) { return m.content.trim(); });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "只支持 POST" });
  try {
    const data = await body(req);
    const url = normalizeUrl(data.url);
    const key = String(data.key || "").trim();
    const model = String(data.model || "").trim();
    const messages = cleanMessages(data.messages);
    if (!key) return send(res, 400, { error: "没有填写 API 密钥" });
    if (!model) return send(res, 400, { error: "没有选择模型" });
    if (!messages.length) return send(res, 400, { error: "没有可发送的消息" });

    const payload = {
      model,
      messages,
      temperature: typeof data.temperature === "number" ? data.temperature : undefined,
      max_tokens: typeof data.max_tokens === "number" ? data.max_tokens : undefined
    };
    Object.keys(payload).forEach(function (k) { if (payload[k] === undefined) delete payload[k]; });

    const upstream = await fetch(endpoint(url, "/chat/completions"), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    const raw = await upstream.text();
    let json;
    try { json = JSON.parse(raw); } catch (e) { json = { error: raw.slice(0, 1200) }; }
    if (!upstream.ok) return send(res, upstream.status, {
      error: (json.error && (json.error.message || json.error)) || json.message || (typeof json === "string" ? json : "上游 API 请求失败"),
      upstream: true,
      status: upstream.status
    });

    const choice = json && Array.isArray(json.choices) ? json.choices[0] : null;
    const message = choice && choice.message ? choice.message : {};
    function contentToText(value) {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) {
        return value.map(function (part) {
          if (typeof part === "string") return part;
          if (!part || typeof part !== "object") return "";
          return typeof part.text === "string" ? part.text :
                 (typeof part.content === "string" ? part.content : "");
        }).join("");
      }
      if (value && typeof value === "object") {
        if (typeof value.text === "string") return value.text;
        if (typeof value.content === "string") return value.content;
      }
      return "";
    }
    let content = contentToText(message.content);
    if (!content.trim()) content = contentToText(message.reasoning_content);
    if (!content.trim() && choice) content = contentToText(choice.text);
    if (!content.trim() && json && typeof json.output_text === "string") content = json.output_text;
    return send(res, 200, {
      content: content,
      model: json.model || model,
      usage: json.usage || null,
      finish_reason: choice && choice.finish_reason || null,
      raw: json
    });
  } catch (e) {
    return send(res, 500, { error: e && e.message || "API 请求失败" });
  }
};
