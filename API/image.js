const { body, send } = require('./_lib');
function normalizeUrl(value) { const raw = String(value || '').trim(); if (!/^https?:\/\//i.test(raw)) throw new Error('API 地址必须以 http:// 或 https:// 开头'); return raw.replace(/\/+$/, ''); }
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: '只支持 POST' });
  try {
    const d = await body(req), url = normalizeUrl(d.url), key = String(d.key || '').trim(), model = String(d.model || '').trim(), prompt = String(d.prompt || '').trim();
    if (!key) return send(res, 400, { error: '没有填写生图 API 密钥' }); if (!model) return send(res, 400, { error: '没有填写生图模型' }); if (!prompt) return send(res, 400, { error: '没有填写生图提示词' });
    const endpoint = /\/images\/generations$/i.test(url) ? url : url + '/images/generations', payload = { model, prompt, n: Number(d.n) > 0 ? Math.min(4, Number(d.n)) : 1 };
    if (d.size) payload.size = String(d.size); if (d.quality) payload.quality = String(d.quality); if (d.response_format) payload.response_format = String(d.response_format);
    const up = await fetch(endpoint, { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    const raw = await up.text(); let j; try { j = JSON.parse(raw); } catch (_) { j = { error: raw.slice(0, 1200) }; }
    if (!up.ok) return send(res, up.status, { error: (j.error && (j.error.message || j.error)) || j.message || '生图 API 请求失败' });
    const items = Array.isArray(j.data) ? j.data.map(x => ({ url: x && x.url || null, b64_json: x && x.b64_json || null, revised_prompt: x && x.revised_prompt || null })).filter(x => x.url || x.b64_json) : [];
    if (!items.length) return send(res, 502, { error: '生图 API 返回成功，但没有找到图片数据' }); return send(res, 200, { data: items, model: j.model || model });
  } catch (e) { return send(res, 500, { error: e && e.message || '生图失败' }); }
};
