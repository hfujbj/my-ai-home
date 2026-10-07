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
  return input.slice(-16).map(function (m) {
    return {
      role: m && ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
      content: typeof (m && m.content) === "string"
        ? m.content.slice(0, 9000)
        : String(m && m.content || "").slice(0, 9000)
    };
  }).filter(function (m) { return m.content.trim(); });
}

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

function sse(res, obj) {
  res.write("data: " + JSON.stringify(obj) + "\n\n");
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

    // 控制回复长度，避免免费模型生成过长内容导致等待时间明显增加。
    const payload = {
      model,
      messages,
      temperature: typeof data.temperature === "number" ? data.temperature : undefined,
      max_tokens: typeof data.max_tokens === "number" ? data.max_tokens : 900,
      stream: true
    };
    Object.keys(payload).forEach(function (k) {
      if (payload[k] === undefined) delete payload[k];
    });

    const upstream = await fetch(endpoint(url, "/chat/completions"), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const rawErr = await upstream.text();
      let jsonErr = {};
      try { jsonErr = JSON.parse(rawErr); } catch (_) {}
      return send(res, upstream.status, {
        error: (jsonErr.error && (jsonErr.error.message || jsonErr.error)) ||
               jsonErr.message || rawErr.slice(0, 1200) || "上游 API 请求失败",
        upstream: true,
        status: upstream.status
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (res.flushHeaders) res.flushHeaders();

    // 某些兼容 API 可能忽略 stream=true，仍返回普通 JSON。
    const contentType = String((upstream.headers && upstream.headers.get("content-type")) || "").toLowerCase();
    if (contentType.includes("application/json")) {
      const raw = await upstream.text();
      let json = {};
      try { json = JSON.parse(raw); } catch (_) {}
      const choice = json && Array.isArray(json.choices) ? json.choices[0] : null;
      const message = choice && choice.message ? choice.message : {};
      let content = contentToText(message.content);
      if (!content.trim()) content = contentToText(message.reasoning_content);
      if (!content.trim() && choice) content = contentToText(choice.text);
      if (!content.trim() && json && typeof json.output_text === "string") content = json.output_text;
      if (!content.trim()) {
        sse(res, { type: "error", error: "模型返回了空消息" });
      } else {
        sse(res, { type: "delta", content: content });
        sse(res, { type: "done", model: json.model || model, usage: json.usage || null });
      }
      res.end();
      return;
    }

    if (!upstream.body || !upstream.body.getReader) {
      sse(res, { type: "error", error: "上游 API 不支持流式读取" });
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const part = await reader.read();
      if (part.done) break;
      buffer += decoder.decode(part.value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payloadText = line.slice(5).trim();
          if (!payloadText || payloadText === "[DONE]") continue;

          let chunk;
          try { chunk = JSON.parse(payloadText); } catch (_) { continue; }

          const choice = chunk && Array.isArray(chunk.choices) ? chunk.choices[0] : null;
          const delta = choice && choice.delta ? choice.delta : {};
          let text = contentToText(delta.content);
          if (!text.trim()) text = contentToText(delta.reasoning_content);

          if (text) sse(res, { type: "delta", content: text });
        }
      }
    }

    // Flush any final partial SSE event.
    buffer += decoder.decode();
    const finalEvents = buffer.split(/\r?\n\r?\n/);
    for (const event of finalEvents) {
      const lines = event.split(/\r?\n/);
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payloadText = line.slice(5).trim();
        if (!payloadText || payloadText === "[DONE]") continue;
        let chunk;
        try { chunk = JSON.parse(payloadText); } catch (_) { continue; }
        const choice = chunk && Array.isArray(chunk.choices) ? chunk.choices[0] : null;
        const delta = choice && choice.delta ? choice.delta : {};
        let text = contentToText(delta.content);
        if (!text.trim()) text = contentToText(delta.reasoning_content);
        if (text) sse(res, { type: "delta", content: text });
      }
    }

    sse(res, { type: "done", model: model });
    res.end();
  } catch (e) {
    // 如果已经开始 SSE，尽量以 SSE 错误结束；否则返回普通 JSON。
    if (res.headersSent) {
      try {
        sse(res, { type: "error", error: e && e.message || "API 请求失败" });
        res.end();
      } catch (_) {}
    } else {
      return send(res, 500, { error: e && e.message || "API 请求失败" });
    }
  }
};
