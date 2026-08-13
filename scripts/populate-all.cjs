// One-pass populate: (1) register missing screens in bop_objects,
// (2) auto-wire screen→api→table dependencies from source, (3) generate
// first-pass help docs (owner 'ai-draft') for every screen without manuals.
// Idempotent: re-run safe. Run from /opt/dessystems-console-dev.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/"/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── parse code registry: route → {id,title,mod} ─────────────────────────────
const regSrc = fs.readFileSync("lib/screen-registry.ts", "utf8");
const SCREENS = [];
for (const m of regSrc.matchAll(/'([^']+)':\s*\{\s*id:\s*'([A-Z]{2}\d{3})',\s*title:\s*'([^']*)',\s*mod:\s*'([^']*)'/g)) {
  SCREENS.push({ route: m[1], id: m[2], title: m[3], mod: m[4] });
}
// registry may map several routes to one id — keep first route per id
const byId = new Map();
for (const s of SCREENS) if (!byId.has(s.id)) byId.set(s.id, s);

function pageFile(route) {
  const rel = "app" + route + "/page.tsx";
  return fs.existsSync(rel) ? rel : null;
}

// extract fetch()'d api paths from a component tree (page + local imports, 1 level)
function apiPathsOf(file) {
  const seen = new Set();
  let src = "";
  try { src = fs.readFileSync(file, "utf8"); } catch { return []; }
  for (const m of src.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"?$\s]+)/g)) {
    let p = m[1].replace(/\/+$/, "");
    seen.add(p);
  }
  // template-literal dynamic segments: fetch(`/api/bop/x/${id}`) → /api/bop/x/[id]
  for (const m of src.matchAll(/fetch\(\s*`(\/api\/[^`]*)`/g)) {
    let p = m[1].split("?")[0].replace(/\$\{[^}]+\}/g, "[id]").replace(/\/+$/, "");
    if (p.startsWith("/api/")) seen.add(p);
  }
  return [...seen];
}

// map an api path to its route.ts file
function apiFile(p) {
  const clean = p.replace(/\[id\]/g, "[id]");
  const rel = "app" + clean + "/route.ts";
  if (fs.existsSync(rel)) return rel;
  // try replacing trailing dynamic segment
  const parts = clean.split("/");
  parts[parts.length - 1] = "[id]";
  const rel2 = "app" + parts.join("/") + "/route.ts";
  return fs.existsSync(rel2) ? rel2 : null;
}

function tablesOf(file) {
  const src = fs.readFileSync(file, "utf8");
  const reads = new Set(), writes = new Set();
  for (const m of src.matchAll(/\.from\(\s*['"`]([a-z0-9_]+)['"`]\s*\)/g)) reads.add(m[1]);
  if (/\.(insert|update|upsert|delete)\(/.test(src)) for (const t of reads) writes.add(t);
  return { reads: [...reads], writes: [...writes] };
}

// button/action labels for docs (crude JSX scrape)
function actionsOf(file) {
  if (!file) return [];
  const src = fs.readFileSync(file, "utf8");
  const out = new Set();
  for (const m of src.matchAll(/<button[^>]*>\s*\{?[^<{]*?([A-Z][A-Za-z /&→-]{2,40})\s*<\/button>/g)) {
    const t = m[1].trim();
    if (t && !/^(Loading|className)/.test(t)) out.add(t);
  }
  return [...out].slice(0, 8);
}

(async () => {
  // current DB state
  const { data: objRows } = await sb.from("bop_objects").select("object_id, route");
  const objIds = new Set((objRows ?? []).map(o => o.object_id));
  const routeToObj = {};
  for (const o of objRows ?? []) if (o.route) routeToObj[o.route] = o.object_id;
  const { data: docRows } = await sb.from("bop_documentation").select("target_id").eq("target_type", "screen");
  const hasDocs = new Set((docRows ?? []).map(d => d.target_id));

  // ── phase 1: register missing screens ──────────────────────────────────────
  const newScreens = [];
  for (const [id, s] of byId) {
    if (!objIds.has("screen:" + id)) {
      newScreens.push({ object_id: "screen:" + id, type: "screen", module: s.mod.slice(0, 3), name: s.title, route: s.route, status: "active", lifecycle_state: "active" });
    }
  }
  if (newScreens.length) {
    const { error } = await sb.from("bop_objects").insert(newScreens);
    if (error) console.error("phase1:", error.message);
  }
  console.log("phase1 screens registered:", newScreens.length, newScreens.map(s => s.object_id.replace("screen:", "")).join(", ") || "-");

  // ── phase 1b: bop_screens (technical catalog behind Help → Technical) ──────
  const { data: bsRows } = await sb.from("bop_screens").select("screen_id, sequence, route");
  const bsHave = new Set((bsRows ?? []).map(r => r.screen_id));
  const bsRoutes = new Set((bsRows ?? []).map(r => r.route).filter(Boolean));
  let seq = Math.max(0, ...(bsRows ?? []).map(r => r.sequence ?? 0));
  const bsAdded = [], bsSkipped = [];
  for (const [id, s] of byId) {
    if (bsHave.has(id)) continue;
    if (bsRoutes.has(s.route)) { bsSkipped.push(id + " (route taken)"); continue; } // route unique
    const { error } = await sb.from("bop_screens").insert({
      screen_id: id, module: s.mod.slice(0, 3), title: s.title, route: s.route,
      func_type: s.route.includes("[id]") ? "detail" : "list", lifecycle_state: "dev",
      sequence: ++seq,
    });
    if (error) bsSkipped.push(id + " (" + error.message.slice(0, 40) + ")");
    else { bsAdded.push(id); bsRoutes.add(s.route); }
  }
  console.log("phase1b bop_screens added:", bsAdded.join(", ") || "-", bsSkipped.length ? "| skipped: " + bsSkipped.join(", ") : "");

  // ── phase 2: dependency wiring ──────────────────────────────────────────────
  let newApis = 0, newEdges = 0, unresolved = [];
  const edgeRows = [], apiObjRows = [];
  const ensuredApis = new Set();
  for (const [id, s] of byId) {
    const pf = pageFile(s.route);
    if (!pf) continue;
    // include locally imported client components in the same dir
    const files = [pf];
    const dir = path.dirname(pf);
    for (const f of fs.readdirSync(dir)) if (f.endsWith(".tsx") && f !== "page.tsx") files.push(path.join(dir, f));
    const apis = new Set();
    for (const f of files) for (const p of apiPathsOf(f)) apis.add(p);
    for (const p of apis) {
      // resolve object id by route match, else create canonical one
      let objId = routeToObj[p];
      if (!objId) {
        // try [id] variant registered with different formatting
        objId = Object.entries(routeToObj).find(([r]) => r === p)?.[1];
      }
      if (!objId) {
        objId = "api:" + p.replace(/^\/api\//, "").replace(/\//g, "/");
        if (!objIds.has(objId) && !ensuredApis.has(objId)) {
          const af0 = apiFile(p);
          if (!af0) { unresolved.push(p); continue; }
          apiObjRows.push({ object_id: objId, type: "api", module: s.mod.slice(0, 3), name: "API " + p, route: p, status: "active", lifecycle_state: "active" });
          ensuredApis.add(objId);
          newApis++;
        }
        routeToObj[p] = objId;
      }
      edgeRows.push({ from_id: "screen:" + id, to_id: objId, dep_type: "calls" });
      const af = apiFile(p);
      if (af) {
        const { reads, writes } = tablesOf(af);
        for (const t of reads) {
          const tid = "table:" + t;
          if (!objIds.has(tid) && !ensuredApis.has(tid)) {
            apiObjRows.push({ object_id: tid, type: "table", module: s.mod.slice(0, 3), name: t, route: null, status: "active", lifecycle_state: "active" });
            ensuredApis.add(tid);
          }
          edgeRows.push({ from_id: objId, to_id: tid, dep_type: writes.includes(t) ? "writes" : "reads" });
        }
      }
    }
  }
  if (apiObjRows.length) {
    for (let i = 0; i < apiObjRows.length; i += 100) {
      const { error } = await sb.from("bop_objects").upsert(apiObjRows.slice(i, i + 100), { onConflict: "object_id", ignoreDuplicates: true });
      if (error) console.error("phase2 objs:", error.message);
    }
  }
  // dedupe edges
  const uniq = [...new Map(edgeRows.map(e => [e.from_id + "|" + e.to_id + "|" + e.dep_type, e])).values()];
  for (let i = 0; i < uniq.length; i += 200) {
    const { error } = await sb.from("bop_dependencies").upsert(uniq.slice(i, i + 200), { onConflict: "from_id,to_id,dep_type", ignoreDuplicates: true });
    if (error) { console.error("phase2 edges:", error.message); break; }
  }
  newEdges = uniq.length;
  console.log("phase2 apis+tables ensured:", apiObjRows.length, "| edges upserted:", newEdges, "| unresolved api paths:", unresolved.length ? unresolved.slice(0, 8).join(", ") : "none");

  // ── phase 3: first-pass help docs ───────────────────────────────────────────
  const MOD_DESC = {
    MDM: "master data", SAL: "sales", CRM: "customer relations", FIN: "finance",
    MKP: "marketplace listings", MKT: "market intelligence", OPS: "operations",
    SYS: "system administration", ANL: "analytics", AST: "assets", INT: "integrations",
    DEV: "development lifecycle", BOP: "BOP platform", PUB: "publishing", AIX: "AI",
  };
  const docRowsNew = [];
  let docScreens = 0;
  for (const [id, s] of byId) {
    if (hasDocs.has(id)) continue;
    const pf = pageFile(s.route);
    const apis = pf ? apiPathsOf(pf) : [];
    const acts = actionsOf(pf);
    const modTxt = MOD_DESC[s.mod] ?? s.mod;
    const overview =
      `**${s.title}** (\`${id}\`) is part of the ${modTxt} module. Route: \`${s.route}\`.` +
      (apis.length ? `\n\nIt works with: ${apis.map(a => "`" + a + "`").join(", ")}.` : "") +
      (acts.length ? `\n\nKey actions on this screen: ${acts.map(a => "**" + a + "**").join(", ")}.` : "") +
      `\n\n_First-pass draft generated from source — review and refine._`;
    docRowsNew.push({ target_type: "screen", target_id: id, doc_type: "overview", seq: 0, title: s.title, body_md: overview, status: "active", owner: "ai-draft" });
    if (acts.length) {
      docRowsNew.push({
        target_type: "screen", target_id: id, doc_type: "steps", seq: 1, title: "Available actions",
        body_md: acts.map((a, i) => `${i + 1}. **${a}**`).join("\n"), status: "active", owner: "ai-draft",
      });
    }
    docScreens++;
  }
  for (let i = 0; i < docRowsNew.length; i += 100) {
    const { error } = await sb.from("bop_documentation").insert(docRowsNew.slice(i, i + 100));
    if (error) { console.error("phase3:", error.message); break; }
  }
  console.log("phase3 draft docs: screens covered:", docScreens, "| rows inserted:", docRowsNew.length);
  console.log("DONE");
})();
