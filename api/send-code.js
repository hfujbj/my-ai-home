// 发送邮箱验证码（QQ 邮箱 / Gmail / 任意邮箱都可以收）
const { sign, body, send, hmac, crypto } = require("./_lib");
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return send(res, 405, { error: "只支持 POST" });
    const em = String((await body(req)).email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return send(res, 400, { error: "邮箱格式不正确" });
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return send(res, 500, { error: "服务器未配置 SMTP_USER / SMTP_PASS" });
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0"), exp = Date.now() + 10 * 60 * 1000;
    const ticket = sign({ email: em, exp, h: hmac(em + ":" + code + ":" + exp) });
    const port = +(process.env.SMTP_PORT || 465);
    const tr = require("nodemailer").createTransport({ host: process.env.SMTP_HOST || "smtp.qq.com", port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await tr.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: em, subject: "【我的 AI 小屋】登录验证码", text: "你的验证码是 " + code + "，10 分钟内有效。如非本人操作，请忽略这封邮件。" });
    send(res, 200, { ok: true, ticket });
  } catch (e) { send(res, 500, { error: "发送失败：" + e.message }); }
};
