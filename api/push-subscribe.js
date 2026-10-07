const { body, send } = require("./_lib");

async function supa(path, opts={}) {
  const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("服务器未配置 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(base + "/rest/v1/" + path, { ...opts, headers: { apikey:key, Authorization:"Bearer "+key, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates", ...(opts.headers||{}) }});
  if (!r.ok) throw new Error(await r.text());
  return r.status === 204 ? null : r.json();
}
module.exports = async (req,res)=>{
  if(req.method!=="POST") return send(res,405,{error:"只支持 POST"});
  try {
    const d=await body(req); const subscription=d.subscription;
    if(!subscription || !subscription.endpoint) return send(res,400,{error:"缺少 Push 订阅信息"});
    const aiId=String(d.aiId||"default");
    await supa("ai_push_subscriptions",{method:"POST",body:JSON.stringify({ai_id:aiId,endpoint:subscription.endpoint,subscription:subscription,enabled:d.enabled!==false,updated_at:new Date().toISOString()})});
    send(res,200,{ok:true});
  } catch(e){ send(res,500,{error:e.message||"保存通知订阅失败"}); }
};
