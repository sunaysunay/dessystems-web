// Apply approved nav plan: assign 16 screens to menu groups; purge SY013/SY030/SY031
// from every definition layer (registry handled separately in code).
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/"/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ASSIGN = [
  // [id, group, subgroup]
  ["AI001", "intelligence", null], ["AI002", "intelligence", null],
  ["AI003", "intelligence", null], ["AI004", "intelligence", null],
  ["CR005", "salesCrm", null],
  ["MP002", "marketplace", null],
  ["MD004", "masterData", null],
  ["SY028", "system", "configuration"], ["SY029", "system", "configuration"],
  ["SY032", "system", "infrastructure"], ["SY006", "system", "infrastructure"], ["SY025", "system", "infrastructure"],
  ["SY020", "system", "accessRoles"], ["SY021", "system", "accessRoles"], ["SY022", "system", "accessRoles"],
  ["SY023", "system", "users"],
];
const REMOVE = ["SY013", "SY030", "SY031"];

(async () => {
  // current max nav_order per group/subgroup
  const { data: navRows } = await sb.from("bop_screens").select("nav_group, nav_subgroup, nav_order").not("nav_group", "is", null);
  const maxOf = {};
  for (const r of navRows ?? []) {
    const k = r.nav_group + "|" + (r.nav_subgroup ?? "");
    maxOf[k] = Math.max(maxOf[k] ?? 0, r.nav_order ?? 0);
  }
  for (const [id, group, sub] of ASSIGN) {
    const k = group + "|" + (sub ?? "");
    const order = (maxOf[k] = (maxOf[k] ?? 0) + 1);
    const { error } = await sb.from("bop_screens").update({
      nav_group: group, nav_subgroup: sub, nav_order: order, nav_visible: true,
    }).eq("screen_id", id);
    console.log("assign", id, "→", group + (sub ? " > " + sub : ""), "#" + order, error ? "ERR " + error.message : "OK");
  }

  // full removal of SY013/SY030/SY031
  for (const id of REMOVE) {
    await sb.from("bop_documentation").delete().eq("target_type", "screen").eq("target_id", id);
    await sb.from("bop_dependencies").delete().or(`from_id.eq.screen:${id},to_id.eq.screen:${id}`);
    await sb.from("bop_objects").delete().eq("object_id", "screen:" + id);
    const { error } = await sb.from("bop_screens").delete().eq("screen_id", id);
    console.log("removed", id, error ? "ERR " + error.message : "OK");
  }
})();
