const { send } = require("./_lib");
module.exports = async (req,res)=>{ if(req.method!=="GET") return send(res,405,{error:"只支持 GET"}); if(!process.env.VAPID_PUBLIC_KEY) return send(res,503,{error:"服务器还没有配置 VAPID_PUBLIC_KEY"}); send(res,200,{publicKey:process.env.VAPID_PUBLIC_KEY}); };
