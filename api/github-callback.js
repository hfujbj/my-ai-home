// GitHub OAuth 回调：用 code 换用户信息，再带着会话令牌跳回首页
const { session } = require("./_lib");
module.exports = async (req, res) => {
  const go = (h) => { res.statusCode = 302; res.setHeader("Location", "/#" + h); res.end(); };
  try {
    const q = req.query || {}; if (!q.code) throw new Error("缺少 code");
    const r = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code: q.code }) });
    const t = await r.json(); if (!t.access_token) throw new Error(t.error_description || "换取令牌失败");
    const u = await (await fetch("https://api.github.com/user", { headers: { Authorization: "Bearer " + t.access_token, "User-Agent": "my-ai-home" } })).json();
    go("login=" + session({ sub: "github:" + u.id, name: u.name || u.login, email: u.email || "", avatar: u.avatar_url || "", provider: "GitHub" }) + "&state=" + encodeURIComponent(q.state || ""));
  } catch (e) { go("login_error=" + encodeURIComponent(e.message)); }
};
