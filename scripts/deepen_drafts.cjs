// Deepen ai-draft manuals: regenerate every screen whose docs are ONLY
// ai-draft (never touches system-authored rows) with four phases —
// overview (richer), steps (buttons/inputs), faq (data location + write ops),
// reference (APIs, methods, tables). Static analysis of page + API sources.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/"/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const src = fs.readFileSync("lib/screen-registry.ts", "utf8");
const SCREENS = [];
const byIdRoutes = {};
for (const m of src.matchAll(/'([^']+)':\s*\{\s*id:\s*'([A-Z]{2}\d{3})',\s*title:\s*'([^']*)',\s*mod:\s*'([^']*)'/g)) {
  (byIdRoutes[m[2]] ??= []).push({ route: m[1], id: m[2], title: m[3], mod: m[4] });
}
for (const variants of Object.values(byIdRoutes)) {
  // prefer the registry route that actually has a page file (skip v3 aliases)
  const withPage = variants.find(v => fs.existsSync(path.join("app", ...v.route.split("/").filter(Boolean), "page.tsx")));
  SCREENS.push(withPage ?? variants[0]);
}

const MOD_DESC = {
  MDM: "master data", SAL: "sales", CRM: "customer relations", FIN: "finance (Dutch bookkeeping: BTW, facturen)",
  MKP: "marketplace listings", MKT: "market intelligence", OPS: "operations tooling",
  SYS: "system administration", ANL: "analytics", AST: "vehicle assets", INT: "integrations",
  DEV: "development lifecycle", BOP: "BOP web analytics", PUB: "publishing", AIM: "AI management",
  AUC: "auctions", LOG: "logistics", COM: "communications", WFL: "workflow", WRK: "workshop",
};

function readSafe(f) { try { return fs.readFileSync(f, "utf8"); } catch { return null; } }

function resolveImport(spec) {
  if (!spec.startsWith("@/")) return null;
  const base = spec.slice(2);
  for (const c of [base + ".tsx", base + ".ts", path.join(base, "index.tsx")]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function pageFiles(route) {
  const dir = path.join("app", ...route.split("/").filter(Boolean));
  const pf = path.join(dir, "page.tsx");
  if (!fs.existsSync(pf)) return [];
  const out = [pf];
  try { for (const f of fs.readdirSync(dir)) if (f.endsWith(".tsx") && f !== "page.tsx") out.push(path.join(dir, f)); } catch {}
  // follow @/ imports up to 2 levels — most console pages render their real UI
  // (and run their queries) inside shared components
  const queue = [...out]; const visited = new Set(out);
  let depth = 0;
  while (queue.length && depth < 2) {
    const wave = queue.splice(0, queue.length);
    depth++;
    for (const f of wave) {
      const s = readSafe(f); if (!s) continue;
      for (const m of s.matchAll(/from\s+['"](@\/[^'"]+)['"]/g)) {
        const rf = resolveImport(m[1]);
        if (rf && !visited.has(rf)) { visited.add(rf); out.push(rf); queue.push(rf); }
      }
    }
  }
  return out;
}

function analyze(route) {
  const files = pageFiles(route);
  let directWrites = false;
  const apis = new Set(), buttons = new Set(), inputs = new Set(), selects = new Set();
  for (const f of files) {
    const s = readSafe(f); if (!s) continue;
    for (const m of s.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"?$\s]+)/g)) apis.add(m[1].replace(/\/+$/, ""));
    for (const m of s.matchAll(/fetch\(\s*`(\/api\/[^`]*)`/g)) apis.add(m[1].split("?")[0].replace(/\$\{[^}]+\}/g, "[id]").replace(/\/+$/, ""));
    for (const m of s.matchAll(/<button[^>]*>\s*\{?[^<{]*?([A-Z][A-Za-z /&€→+-]{2,40})\s*<\/button>/g)) {
      const t = m[1].trim(); if (t && t.length > 2) buttons.add(t);
    }
    for (const m of s.matchAll(/placeholder=["']([^"']{3,50})["']/g)) inputs.add(m[1]);
    for (const m of s.matchAll(/<label[^>]*>\s*([A-Z][^<{]{2,35})\s*</g)) inputs.add(m[1].trim());
  }
  // direct client-side supabase queries (many console components skip /api)
  const directTables = new Set();
  for (const f of files) {
    const s2 = readSafe(f); if (!s2) continue;
    for (const m of s2.matchAll(/\.from\(\s*['"`]([a-z0-9_]+)['"`]\s*\)/g)) directTables.add(m[1]);
    if (/\.(insert|update|upsert|delete)\(/.test(s2)) directWrites = true;
  }
  // API details
  const details = [];
  const tables = new Set(); let writes = false;
  for (const t of directTables) tables.add(t);
  for (const p of apis) {
    let rf = path.join("app", ...p.split("/").filter(Boolean), "route.ts");
    if (!fs.existsSync(rf)) {
      const parts = p.split("/").filter(Boolean); parts[parts.length - 1] = "[id]";
      rf = path.join("app", ...parts, "route.ts");
    }
    const s = readSafe(rf);
    if (!s) { details.push({ path: p, methods: [], tables: [], phantom: true }); continue; }
    const methods = ["GET", "POST", "PATCH", "PUT", "DELETE"].filter(mm => new RegExp("export\\s+async\\s+function\\s+" + mm).test(s));
    const t = [...new Set([...s.matchAll(/\.from\(\s*['"`]([a-z0-9_]+)['"`]\s*\)/g)].map(m => m[1]))];
    t.forEach(x => tables.add(x));
    if (/\.(insert|update|upsert|delete)\(/.test(s)) writes = true;
    details.push({ path: p, methods, tables: t, phantom: false });
  }
  return { apis: details, buttons: [...buttons].slice(0, 10), inputs: [...inputs].slice(0, 8), tables: [...tables], writes: writes || directWrites, directTables: [...directTables] };
}

(async () => {
  // screens whose docs are exclusively ai-draft
  const { data: docs } = await sb.from("bop_documentation").select("target_id, owner").eq("target_type", "screen");
  const owners = {};
  for (const d of docs ?? []) (owners[d.target_id] ??= new Set()).add(d.owner);
  // any screen with ai-draft rows (system rows like process links coexist and
  // are never touched — we only delete/replace owner='ai-draft')
  const targets = SCREENS.filter(s => owners[s.id] && owners[s.id].has("ai-draft"));
  console.log("screens to deepen:", targets.length);

  let batch = [], done = 0;
  for (const s of targets) {
    const a = analyze(s.route);
    const modTxt = MOD_DESC[s.mod] ?? s.mod;
    const isMenu = s.route.startsWith("/menu");
    const rows = [];
    const R = (doc_type, seq, title, body_md) => rows.push({
      target_type: "screen", target_id: s.id, doc_type, seq, title, body_md, status: "active", owner: "ai-draft",
    });

    // overview
    let ov = `**${s.title}** (\`${s.id}\`) belongs to the ${modTxt} module. Route: \`${s.route}\`.`;
    if (isMenu) ov += `\n\nThis is a **menu hub** — it groups and links related screens rather than working with data directly.`;
    else if (a.tables.length) ov += `\n\nIt ${a.writes ? "reads and writes" : "reads"} data in: ${a.tables.map(t => "`" + t + "`").join(", ")}.`;
    if (a.buttons.length) ov += `\n\nMain actions: ${a.buttons.slice(0, 5).map(b => "**" + b + "**").join(" · ")}.`;
    ov += `\n\n_ai-draft (deepened pass) — review and refine._`;
    R("overview", 0, s.title, ov);

    // steps
    if (a.buttons.length || a.inputs.length) {
      let st = "";
      if (a.inputs.length) st += "**Fields / filters on this screen:** " + a.inputs.map(i => "`" + i + "`").join(", ") + "\n\n";
      if (a.buttons.length) st += "**Actions:**\n" + a.buttons.map((b, i) => `${i + 1}. **${b}**`).join("\n");
      R("steps", 1, "Working with this screen", st.trim());
    }

    // faq
    if (!isMenu && a.tables.length) {
      R("faq", 1, "Where does this data live?",
        `Primary table${a.tables.length > 1 ? "s" : ""}: ${a.tables.map(t => "`" + t + "`").join(", ")} (Supabase/Postgres). ` +
        (a.writes ? "This screen writes — changes are immediate and, where applicable, audit-logged." : "This screen is read-only over its data."));
    }
    const phantoms = a.apis.filter(x => x.phantom);
    if (phantoms.length) {
      R("faq", 2, "Known issue: missing backend",
        `This screen calls ${phantoms.map(p => "`" + p.path + "`").join(", ")} — endpoint${phantoms.length > 1 ? "s" : ""} not present in the codebase. Parts of the screen may not load until the API is built (tracked in DV007 phantom list).`);
    }

    // reference
    if (a.apis.length || a.directTables.length) {
      const lines = a.apis.map(x =>
        `- \`${x.path}\`${x.methods.length ? " — " + x.methods.join("/") : ""}${x.tables.length ? " → " + x.tables.map(t => "`" + t + "`").join(", ") : ""}${x.phantom ? " ⚠ missing" : ""}`
      );
      if (a.directTables.length) lines.push("- direct Supabase queries → " + a.directTables.map(t => "`" + t + "`").join(", "));
      R("reference", 1, "APIs & data", lines.join("\n"));
    }

    // replace this screen's drafts
    await sb.from("bop_documentation").delete().eq("target_type", "screen").eq("target_id", s.id).eq("owner", "ai-draft");
    batch.push(...rows);
    if (batch.length >= 80) {
      const { error } = await sb.from("bop_documentation").insert(batch);
      if (error) { console.error("insert:", error.message); process.exit(1); }
      done += batch.length; batch = [];
    }
  }
  if (batch.length) {
    const { error } = await sb.from("bop_documentation").insert(batch);
    if (error) { console.error("insert:", error.message); process.exit(1); }
    done += batch.length;
  }
  console.log("deepened rows inserted:", done, "across", targets.length, "screens");
})();
