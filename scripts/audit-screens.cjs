// TC completeness audit: code registry vs bop_objects / bop_documentation /
// bop_dependencies. Run: node scripts/audit-screens.cjs
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local","utf8").split("\n").forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/); if(m) process.env[m[1]]=m[2].replace(/"/g,"");});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const src = fs.readFileSync("lib/screen-registry.ts","utf8");
const ids = [...new Set([...src.matchAll(/id: .([A-Z]{2}\d{3})./g)].map(m=>m[1]))];
(async () => {
  const { data: objs } = await sb.from("bop_objects").select("object_id").eq("type","screen");
  const reg = new Set((objs??[]).map(o=>o.object_id.replace("screen:","")));
  const { data: docs } = await sb.from("bop_documentation").select("target_id").eq("target_type","screen");
  const doc = new Set((docs??[]).map(d=>d.target_id));
  const { data: deps } = await sb.from("bop_dependencies").select("from_id").like("from_id","screen:%");
  const dep = new Set((deps??[]).map(d=>d.from_id.replace("screen:","")));
  console.log("TCs in registry:", ids.length);
  console.log("missing bop_objects:", ids.filter(i=>!reg.has(i)).join(", ")||"none");
  console.log("missing docs:", ids.filter(i=>!doc.has(i)).length);
  console.log("missing deps:", ids.filter(i=>!dep.has(i)).length);
})();
