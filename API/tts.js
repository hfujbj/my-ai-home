const { body, send } = require('./_lib');
function normalizeUrl(value) { const raw = String(value || '').trim(); if (!/^https?:\/\//i.test(raw)) throw new Error('API 地址必须以 http:// 或 https:// 开头'); return raw.replace(/\/+$/, ''); }
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: '只支持 POST' });
  try {
    const d = await body(req), provider = String(d.provider || 'custom').toLowerCase(), url = normalizeUrl(d.url), key = String(d.key || '').trim(), model = String(d.model || '').trim(), voice = String(d.voice || '').trim(), text = String(d.text || '').trim();
    if (!key) return send(res, 400, { error: '没有填写语音 API 密钥' });
    if (!text) return send(res, 400, { error: '没有可合成的文字' });
    let endpoint, headers = { 'Content-Type': 'application/json', Accept: 'audio/mpeg,audio/*,application/json' }, payload;
    if (provider === 'eleven') { if (!voice) return send(res, 400, { error: 'ElevenLabs 需要填写音色 ID' }); endpoint = /\/text-to-speech\//i.test(url) ? url : url + '/text-to-speech/' + encodeURIComponent(voice); headers = { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }; payload = { text, model_id: model || 'eleven_multilingual_v2' }; }
    else if (provider === 'fish') { endpoint = /\/tts$/i.test(url) ? url : url + '/tts'; headers.Authorization = 'Bearer ' + key; payload = { text, reference_id: voice || undefined, format: 'mp3' }; if (model) headers.model = model; }
    else { endpoint = /\/audio\/speech$/i.test(url) ? url : url + '/audio/speech'; headers.Authorization = 'Bearer ' + key; payload = { model: model || 'tts-1', input: text, voice: voice || 'alloy', response_format: 'mp3' }; }
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    const up = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) }), ct = up.headers.get('content-type') || '', raw = await up.arrayBuffer();
    if (!up.ok) { const t = new TextDecoder().decode(raw).slice(0, 1200); let msg = t; try { const j = JSON.parse(t); msg = (j.error && (j.error.message || j.error)) || j.message || t; } catch (_) {} return send(res, up.status, { error: msg || '语音 API 请求失败' }); }
    res.statusCode = 200; res.setHeader('Content-Type', ct.includes('audio') ? ct.split(';')[0] : 'audio/mpeg'); res.setHeader('Cache-Control', 'no-store'); res.end(Buffer.from(raw));
  } catch (e) { return send(res, 500, { error: e && e.message || '语音合成失败' }); }
};
