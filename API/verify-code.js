const { verify, session, body, send, hmac, crypto } = require("./_lib");
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return send(res, 405, { error: "只支持 POST" });
    const b = await body(req), em = String(b.email || "").trim().toLowerCase(), code = String(b.code || "").trim();
    const t = verify(b.ticket);
    if (!t || t.email !== em) return send(res, 400, { error: "验证码已过期，请重新获取" });
    const want = hmac(em + ":" + code + ":" + t.exp), ok = want.length === t.h.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(t.h));
    if (!ok) return send(res, 400, { error: "验证码不正确" });
    send(res, 200, { token: session({ sub: "email:" + em, name: em.split("@")[0], email: em, provider: /@qq\.com$/.test(em) ? "QQ 邮箱" : "邮箱" }) });
  } catch (e) { send(res, 500, { error: e.message }); }
};
