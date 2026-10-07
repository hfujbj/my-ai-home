// 公共工具：签名 / 验签 / 会话令牌（无数据库，纯无状态）
const crypto = require("crypto");
const b64 = (s) => Buffer.from(s).toString("base64url");
function secret() { if (!process.env.SESSION_SECRET) throw new Error("服务器未配置 SESSION_SECRET"); return process.env.SESSION_SECRET; }
const hmac = (s) => crypto.createHmac("sha256", secret()).update(s).digest("base64url");
function sign(payload) { const p = b64(JSON.stringify(payload)); return p + "." + hmac(p); }
function verify(token) {
  if (!token || token.indexOf(".") < 0) return null;
  const [p, s] = String(token).split("."); const e = hmac(p);
  if (!s || s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  try { const d = JSON.parse(Buffer.from(p, "base64url").toString()); return d.exp && d.exp < Date.now() ? null : d; } catch (e) { return null; }
}
function session(u) { return sign({ sub: u.sub, name: u.name, email: u.email || "", avatar: u.avatar || "", provider: u.provider, exp: Date.now() + 30 * 864e5 }); }
async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return {};
}
function send(res, status, obj) { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); }
module.exports = { sign, verify, session, body, send, hmac, crypto };
