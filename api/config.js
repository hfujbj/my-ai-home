const { send } = require("./_lib");
module.exports = (req, res) => send(res, 200, {
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  emailEnabled: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
});
