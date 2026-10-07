const webpush = require("web-push");
const { body, send } = require("./_lib");

function okCron(req){ const s=process.env.CRON_SECRET; return !s || req.headers.authorization === "Bearer "+s; }
async function supa(path, opts={}){
 const base=String(process.env.SUPABASE_URL||"").replace(/\/$/,""); const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key) throw new Error("服务器未配置 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
 const r=await fetch(base+"/rest/v1/"+path,{...opts,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}});
 if(!r.ok) throw new Error(await r.text()); return r.status===204?null:r.json();
}
async function ai(text){
 const url=String(process.env.PROACTIVE_AI_URL||"").replace(/\/$/,""); const key=process.env.PROACTIVE_AI_KEY; const model=process.env.PROACTIVE_AI_MODEL;
 if(!url||!key||!model) throw new Error("服务器未配置 PROACTIVE_AI_URL / PROACTIVE_AI_KEY / PROACTIVE_AI_MODEL");
 const endpoint=/\/chat\/completions$/i.test(url)?url:url+"/chat/completions";
 const r=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:"你是用户的小屋 AI。现在不是在等待用户发消息，而是你自己想主动找用户说一句自然、简短、有上下文感的话。不要提及后台、定时任务、系统、API。不要每次都问在干嘛。最多 2 句。"},{role:"user",content:text}],temperature:.9,max_tokens:120})});
 if(!r.ok) throw new Error((await r.text()).slice(0,500)); const j=await r.json(); return String(j.choices?.[0]?.message?.content||j.output_text||"").trim();
}
module.exports=async(req,res)=>{
 if(!okCron(req)) return send(res,401,{error:"Unauthorized"});
 if(req.method!=="GET"&&req.method!=="POST") return send(res,405,{error:"只支持 GET/POST"});
 try {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT||"mailto:admin@example.com",process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
  const rows=await supa("ai_push_subscriptions?enabled=eq.true&select=*&limit=100");
  const now=new Date(); let sent=0;
  for(const row of rows||[]) {
   const cfg=await supa("ai_proactive_settings?ai_id=eq."+encodeURIComponent(row.ai_id)+"&select=*&limit=1");
   const c=cfg&&cfg[0]; if(!c||!c.enabled) continue;
   const min=(Number(c.min_interval_minutes)||120)*60000; if(c.last_sent_at && now-new Date(c.last_sent_at)<min) continue;
   const h=now.getHours(); const sh=Number(c.start_hour??8), eh=Number(c.end_hour??23); if(sh<eh ? !(h>=sh&&h<eh) : !(h>=sh||h<eh)) continue;
   const msg=await ai("AI 名称："+(c.ai_name||"小屋 AI")+"\n主动程度："+(c.level||"natural")+"\n最近一次主动联系："+(c.last_sent_at||"从未")+"\n请现在主动给用户留一句话。随机一点，但不要太频繁打扰。");
   if(!msg) continue;
   try { await webpush.sendNotification(row.subscription,JSON.stringify({title:c.ai_name||"小屋 AI",body:msg,url:"/"})); } catch(e){ if(e.statusCode===404||e.statusCode===410) { await supa("ai_push_subscriptions?endpoint=eq."+encodeURIComponent(row.endpoint),{method:"DELETE"}); } else throw e; }
   await supa("ai_proactive_settings?ai_id=eq."+encodeURIComponent(row.ai_id),{method:"PATCH",body:JSON.stringify({last_sent_at:now.toISOString()})}); sent++;
  }
  send(res,200,{ok:true,sent});
 } catch(e){ send(res,500,{error:e.message||"主动消息任务失败"}); }
};
