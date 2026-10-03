// Google 登录：前端拿到 id_token 后交给这里校验
const { session, body, send } = require("./_lib");
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return send(res, 405, { error: "只支持 POST" });
    const b = await body(req);
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(b.id_token || "")), t = await r.json();
    if (!r.ok) throw new Error(t.error_description || "令牌无效");
    if (!process.env.GOOGLE_CLIENT_ID || t.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("客户端 ID 不匹配");
    if (b.nonce && t.nonce !== b.nonce) throw new Error("nonce 校验失败");
    if (t.iss !== "accounts.google.com" && t.iss !== "https://accounts.google.com") throw new Error("签发方不正确");
    send(res, 200, { token: session({ sub: "google:" + t.sub, name: t.name || t.email, email: t.email, avatar: t.picture || "", provider: "Google" }) });
  } catch (e) { send(res, 400, { error: e.message }); }
};
