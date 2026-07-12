"use client"

import { useEffect } from "react"

/* ─────────────────────────────────────────────────────────────────────────
   DES BOP V2 — Platform landing (v2, richer).
   Adds an economics band, three UI-mockup snapshots, tag-pill hero.
   Scoped entirely under `.bopv2`. Site Nav + Footer come from the locale
   layout, so the sample's own header/footer are dropped.
   ───────────────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;450;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.bopv2{
  --ink:#0A0D10;--ink-2:#10151A;--panel:#151B21;--panel-2:#1A222A;
  --line:#212A32;--line-2:#2C3742;--line-3:#3A4854;
  --fog:#8A99A6;--fog-2:#5C6B76;--paper:#F0F2F4;--paper-dim:#C4CDD4;
  --plate:#F5C518;--plate-deep:#E0AE00;--live:#3DDC84;--live-dim:#1c6b43;--alert:#FF5D5D;--blue:#6BA8F0;
  --radius:4px;--mono:'IBM Plex Mono',monospace;--disp:'Space Grotesk',sans-serif;--body:'Inter',sans-serif;
  background:var(--ink);color:var(--paper);font-family:var(--body);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden;
}
.bopv2 *{margin:0;padding:0;box-sizing:border-box}
.bopv2 ::selection{background:var(--plate);color:#000}
.bopv2 a{color:inherit;text-decoration:none}
.bopv2 .wrap{max-width:1200px;margin:0 auto;padding:0 30px}
.bopv2 .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--fog-2);display:flex;align-items:center;gap:11px}
.bopv2 .eyebrow::before{content:"";width:24px;height:1px;background:var(--plate)}

/* hero */
.bopv2 .hero{position:relative;padding:110px 0 30px;border-bottom:1px solid var(--line);overflow:hidden}
.bopv2 .hero::before{content:"";position:absolute;top:-40%;right:-10%;width:60%;height:120%;background:radial-gradient(closest-side,rgba(245,197,24,.08),transparent);pointer-events:none}
.bopv2 .hero-grid{display:grid;grid-template-columns:1.02fr .98fr;gap:52px;align-items:center;position:relative}
.bopv2 .hero .tagpill{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--plate);border:1px solid rgba(245,197,24,.25);background:rgba(245,197,24,.05);padding:6px 13px;border-radius:100px;margin-bottom:22px}
.bopv2 .hero .tagpill .d{width:6px;height:6px;border-radius:50%;background:var(--plate)}
.bopv2 .hero h1{font-family:var(--disp);font-weight:700;font-size:clamp(40px,5.6vw,66px);line-height:.97;letter-spacing:-.027em}
.bopv2 .hero h1 .plate-word{color:var(--plate)}
.bopv2 .hero .lede{margin-top:24px;color:var(--paper-dim);font-size:18.5px;max-width:36ch;line-height:1.5}
.bopv2 .hero .sub{margin-top:14px;color:var(--fog);font-size:14.5px;max-width:44ch}
.bopv2 .hero-cta{display:flex;gap:12px;margin-top:32px;flex-wrap:wrap}
.bopv2 .btn{font-family:var(--mono);font-size:13px;letter-spacing:.03em;padding:14px 24px;border-radius:var(--radius);transition:.18s;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:9px}
.bopv2 .btn-primary{background:var(--plate);color:#000;font-weight:600;box-shadow:inset 0 0 0 1.5px #000}
.bopv2 .btn-primary:hover{background:var(--plate-deep);transform:translateY(-1px)}
.bopv2 .btn-ghost{border-color:var(--line-2);color:var(--paper)}
.bopv2 .btn-ghost:hover{border-color:var(--fog)}
@media(max-width:900px){.bopv2 .hero-grid{grid-template-columns:1fr;gap:40px}.bopv2 .hero .lede{max-width:none}}

/* console */
.bopv2 .console{background:var(--ink-2);border:1px solid var(--line-2);border-radius:10px;overflow:hidden;box-shadow:0 40px 90px -35px rgba(0,0,0,.85)}
.bopv2 .console-bar{display:flex;align-items:center;gap:9px;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--panel)}
.bopv2 .console-bar .dot{width:10px;height:10px;border-radius:50%;background:var(--line-3)}
.bopv2 .console-bar .title{margin-left:8px;font-family:var(--mono);font-size:11.5px;color:var(--fog);letter-spacing:.04em}
.bopv2 .console-bar .live-badge{margin-left:auto;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--live);display:flex;align-items:center;gap:6px}
.bopv2 .console-bar .live-badge::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--live);animation:bopv2pulse 1.8s infinite}
@keyframes bopv2pulse{0%{box-shadow:0 0 0 0 rgba(61,220,132,.5)}70%{box-shadow:0 0 0 7px rgba(61,220,132,0)}100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}}
.bopv2 .console-body{padding:6px 0 8px;font-family:var(--mono);font-size:12.5px;min-height:330px}
.bopv2 .step{display:grid;grid-template-columns:26px 1fr;gap:12px;padding:9px 18px;opacity:.24;transition:opacity .4s,background .4s;border-left:2px solid transparent}
.bopv2 .step.active{opacity:1;background:linear-gradient(90deg,rgba(245,197,24,.05),transparent);border-left-color:var(--plate)}
.bopv2 .step.done{opacity:.6}
.bopv2 .step .ico{width:22px;height:22px;border-radius:4px;border:1px solid var(--line-2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--fog);margin-top:1px}
.bopv2 .step.active .ico{border-color:var(--plate);color:var(--plate)}
.bopv2 .step.done .ico{border-color:var(--live-dim);color:var(--live)}
.bopv2 .step .who{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--fog-2);margin-bottom:2px}
.bopv2 .step.active .who.ai{color:var(--live)}
.bopv2 .step .txt{color:var(--paper-dim);line-height:1.4}
.bopv2 .step .txt b{color:var(--paper);font-weight:600}
.bopv2 .step .txt .yellow{color:var(--plate)}
.bopv2 .console-foot{border-top:1px solid var(--line);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--fog-2)}
.bopv2 .console-foot .prog{display:flex;gap:4px}
.bopv2 .console-foot .prog i{width:15px;height:3px;border-radius:2px;background:var(--line-2);transition:.3s}
.bopv2 .console-foot .prog i.on{background:var(--plate)}

/* economics band */
.bopv2 .econ{padding:30px 0;border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--ink-2),var(--ink))}
.bopv2 .econ-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:22px}
.bopv2 .econ-head .t{font-family:var(--disp);font-weight:600;font-size:19px;letter-spacing:-.01em}
.bopv2 .econ-head .t b{color:var(--plate)}
.bopv2 .econ-head .note{font-family:var(--mono);font-size:11px;color:var(--fog-2);letter-spacing:.04em}
.bopv2 .stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.bopv2 .stat{border:1px solid var(--line);border-radius:10px;padding:20px 20px 18px;background:var(--ink-2);position:relative;overflow:hidden;transition:.2s}
.bopv2 .stat:hover{border-color:var(--line-2);transform:translateY(-2px)}
.bopv2 .stat .k{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--fog-2)}
.bopv2 .stat .n{font-family:var(--disp);font-weight:700;font-size:clamp(28px,3.2vw,38px);letter-spacing:-.025em;margin-top:10px;line-height:1}
.bopv2 .stat .n .cur{color:var(--plate);font-size:.55em;vertical-align:super}
.bopv2 .stat.hl .n{color:var(--plate)}
.bopv2 .stat.green .n{color:var(--live)}
.bopv2 .stat .sub{font-size:12px;color:var(--fog);margin-top:8px;line-height:1.4}
@media(max-width:900px){.bopv2 .stat-row{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.bopv2 .stat-row{grid-template-columns:1fr}}

/* strip */
.bopv2 .strip{padding:22px 0;border-bottom:1px solid var(--line)}
.bopv2 .strip-inner{display:flex;align-items:center;gap:26px;flex-wrap:wrap;justify-content:center}
.bopv2 .strip .lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;color:var(--fog-2);text-transform:uppercase}
.bopv2 .strip .chip{font-family:var(--disp);font-weight:500;font-size:15px;color:var(--fog)}
.bopv2 .strip .chip:hover{color:var(--paper)}

/* sections */
.bopv2 section.pad{padding:84px 0;border-bottom:1px solid var(--line)}
.bopv2 .sec-head{max-width:660px;margin-bottom:44px}
.bopv2 .sec-head h2{font-family:var(--disp);font-weight:600;font-size:clamp(28px,3.7vw,42px);letter-spacing:-.02em;line-height:1.04;margin-top:16px}
.bopv2 .sec-head p{color:var(--fog);margin-top:16px;font-size:16.5px;max-width:54ch}

/* snapshot frame */
.bopv2 .snap{border:1px solid var(--line-2);border-radius:10px;overflow:hidden;background:var(--ink-2);box-shadow:0 30px 70px -40px rgba(0,0,0,.8)}
.bopv2 .snap-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--panel);border-bottom:1px solid var(--line)}
.bopv2 .snap-bar .d{width:9px;height:9px;border-radius:50%;background:var(--line-3)}
.bopv2 .snap-bar .p{margin-left:8px;font-family:var(--mono);font-size:11px;color:var(--fog);letter-spacing:.03em}
.bopv2 .snap-cap{font-family:var(--mono);font-size:11px;color:var(--fog-2);margin-top:12px;letter-spacing:.04em;display:flex;align-items:center;gap:8px}
.bopv2 .snap-cap::before{content:"▸";color:var(--plate)}

/* split */
.bopv2 .split{display:grid;grid-template-columns:1fr 1.15fr;gap:44px;align-items:center}
.bopv2 .split.rev{grid-template-columns:1.15fr 1fr}
.bopv2 .split .copy h3{font-family:var(--disp);font-weight:600;font-size:24px;letter-spacing:-.015em;margin:14px 0 12px}
.bopv2 .split .copy p{color:var(--fog);font-size:15.5px;margin-bottom:16px}
.bopv2 .split .copy ul{list-style:none}
.bopv2 .split .copy li{font-size:14px;color:var(--paper-dim);padding:7px 0;display:flex;gap:10px;border-top:1px solid var(--line)}
.bopv2 .split .copy li::before{content:"→";color:var(--live)}
@media(max-width:880px){.bopv2 .split,.bopv2 .split.rev{grid-template-columns:1fr;gap:28px}.bopv2 .split .snapwrap{order:2}}

/* mock: nav shell */
.bopv2 .mock-nav{font-family:var(--body);padding:0;display:grid;grid-template-columns:200px 1fr;min-height:320px}
.bopv2 .mn-side{border-right:1px solid var(--line);padding:14px 0;background:var(--ink)}
.bopv2 .mn-group{font-family:var(--mono);font-size:9px;letter-spacing:.14em;color:var(--fog-2);text-transform:uppercase;padding:10px 16px 6px}
.bopv2 .mn-item{display:flex;align-items:center;gap:10px;padding:7px 16px;font-size:12.5px;color:var(--paper-dim);position:relative}
.bopv2 .mn-item .ic{width:15px;height:15px;color:var(--fog)}
.bopv2 .mn-item .code{margin-left:auto;font-family:var(--mono);font-size:8.5px;color:var(--fog-2);letter-spacing:.05em}
.bopv2 .mn-item.sel{background:rgba(245,197,24,.07);color:var(--paper);border-left:2px solid var(--plate)}
.bopv2 .mn-item.sel .ic{color:var(--plate)}
.bopv2 .mn-main{padding:16px 18px;background:var(--ink-2)}
.bopv2 .mn-crumb{font-family:var(--mono);font-size:10px;color:var(--fog-2);letter-spacing:.06em;margin-bottom:14px}
.bopv2 .mn-crumb b{color:var(--plate)}
.bopv2 .mn-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bopv2 .mn-tile{border:1px solid var(--line);border-radius:6px;padding:10px;background:var(--ink)}
.bopv2 .mn-tile .tk{font-family:var(--mono);font-size:8.5px;color:var(--fog-2);letter-spacing:.08em}
.bopv2 .mn-tile .tn{font-family:var(--disp);font-weight:600;font-size:16px;margin-top:6px}
.bopv2 .mn-tile .ts{font-size:10px;color:var(--fog);margin-top:2px}

/* mock: datagrid */
.bopv2 .mock-grid{font-family:var(--mono);font-size:11px}
.bopv2 .mg-toolbar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--ink)}
.bopv2 .mg-toolbar .search{flex:1;background:var(--ink-2);border:1px solid var(--line-2);border-radius:4px;padding:5px 10px;color:var(--fog);font-size:10.5px}
.bopv2 .mg-toolbar .b{border:1px solid var(--line-2);border-radius:4px;padding:5px 9px;color:var(--paper-dim);font-size:10px;display:flex;gap:5px;align-items:center}
.bopv2 .mg-toolbar .b.ai{border-color:var(--live-dim);color:var(--live)}
.bopv2 .mg-table{width:100%;border-collapse:collapse}
.bopv2 .mg-table th{text-align:left;padding:8px 12px;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--fog-2);border-bottom:1px solid var(--line-2);background:var(--panel);font-weight:400}
.bopv2 .mg-table td{padding:8px 12px;border-bottom:1px solid var(--line);color:var(--paper-dim)}
.bopv2 .mg-table tr:hover td{background:rgba(245,197,24,.03)}
.bopv2 .mg-table .pk{color:var(--plate)}
.bopv2 .badge{display:inline-block;padding:2px 7px;border-radius:3px;font-size:9px;letter-spacing:.03em}
.bopv2 .badge.live{background:rgba(61,220,132,.12);color:var(--live)}
.bopv2 .badge.draft{background:rgba(107,168,240,.12);color:var(--blue)}
.bopv2 .badge.sold{background:rgba(138,153,166,.15);color:var(--fog)}

/* mock: AI panel */
.bopv2 .mock-ai{padding:0}
.bopv2 .mai-head{display:flex;align-items:center;gap:9px;padding:12px 15px;border-bottom:1px solid var(--line);background:var(--panel)}
.bopv2 .mai-head .spark{color:var(--live)}
.bopv2 .mai-head .t{font-family:var(--disp);font-weight:600;font-size:13px}
.bopv2 .mai-head .ctx{margin-left:auto;font-family:var(--mono);font-size:9.5px;color:var(--fog-2)}
.bopv2 .mai-body{padding:14px 15px}
.bopv2 .mai-ctxcard{border:1px solid var(--line);border-radius:6px;padding:10px 12px;margin-bottom:12px;background:var(--ink)}
.bopv2 .mai-ctxcard .l{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--fog-2)}
.bopv2 .mai-ctxcard .v{font-size:13px;margin-top:3px;color:var(--paper)}
.bopv2 .mai-ctxcard .v .plate{color:var(--plate);font-family:var(--mono)}
.bopv2 .mai-actions{display:flex;flex-direction:column;gap:7px}
.bopv2 .mai-act{display:flex;align-items:center;gap:10px;border:1px solid var(--line-2);border-radius:6px;padding:9px 11px;font-size:12.5px;color:var(--paper-dim);transition:.15s;cursor:default}
.bopv2 .mai-act:hover{border-color:var(--live-dim);color:var(--paper)}
.bopv2 .mai-act .i{color:var(--live);font-size:13px}
.bopv2 .mai-act .go{margin-left:auto;font-family:var(--mono);font-size:9px;color:var(--fog-2)}

/* mock: listing card */
.bopv2 .mock-list{padding:14px 15px}
.bopv2 .ml-top{display:flex;gap:12px}
.bopv2 .ml-photo{width:120px;height:82px;border-radius:6px;background:linear-gradient(135deg,var(--panel-2),var(--ink));border:1px solid var(--line-2);position:relative;flex-shrink:0;overflow:hidden}
.bopv2 .ml-photo::after{content:"AI ✦";position:absolute;bottom:5px;right:5px;font-family:var(--mono);font-size:8px;color:var(--live);background:rgba(10,13,16,.7);padding:2px 5px;border-radius:3px}
.bopv2 .ml-photo .car{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--line-3)}
.bopv2 .ml-info{flex:1}
.bopv2 .ml-info .tt{font-family:var(--disp);font-weight:600;font-size:15px}
.bopv2 .ml-info .meta{font-family:var(--mono);font-size:10px;color:var(--fog);margin-top:4px;letter-spacing:.03em}
.bopv2 .ml-info .price{font-family:var(--disp);font-weight:700;font-size:20px;color:var(--plate);margin-top:8px}
.bopv2 .ml-info .price small{font-family:var(--mono);font-size:9px;color:var(--live);font-weight:400;margin-left:6px}
.bopv2 .ml-langs{display:flex;gap:5px;margin-top:12px;flex-wrap:wrap}
.bopv2 .ml-lang{font-family:var(--mono);font-size:9px;padding:3px 7px;border:1px solid var(--line-2);border-radius:3px;color:var(--fog)}
.bopv2 .ml-lang.on{border-color:var(--plate);color:var(--plate)}
.bopv2 .ml-chan{display:flex;gap:6px;margin-top:12px;padding-top:11px;border-top:1px solid var(--line);flex-wrap:wrap}
.bopv2 .ml-chan span{font-family:var(--mono);font-size:9.5px;color:var(--paper-dim);display:flex;align-items:center;gap:4px}
.bopv2 .ml-chan span::before{content:"●";color:var(--live);font-size:7px}

/* fragmentation */
.bopv2 .frag{display:grid;grid-template-columns:1fr 80px 1fr;gap:22px;align-items:center}
.bopv2 .frag .col-h{font-family:var(--mono);font-size:11px;letter-spacing:.14em;color:var(--fog-2);text-transform:uppercase;margin-bottom:14px}
.bopv2 .tool-cloud{display:flex;flex-wrap:wrap;gap:8px}
.bopv2 .tool-cloud span{font-family:var(--mono);font-size:12px;padding:7px 11px;border:1px solid var(--line);border-radius:var(--radius);color:var(--fog);background:var(--ink-2)}
.bopv2 .frag-arrow{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--plate)}
.bopv2 .frag-arrow .a{font-size:26px}
.bopv2 .frag-arrow .l{font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--fog-2);writing-mode:vertical-rl;transform:rotate(180deg)}
.bopv2 .one-panel{border:1px solid var(--line-2);border-radius:10px;background:linear-gradient(160deg,var(--panel),var(--ink-2));padding:26px;position:relative;overflow:hidden}
.bopv2 .one-panel::after{content:"";position:absolute;inset:0;background:radial-gradient(400px 120px at 80% -10%,rgba(245,197,24,.12),transparent)}
.bopv2 .one-panel .big{font-family:var(--disp);font-weight:700;font-size:28px;letter-spacing:-.02em;position:relative}
.bopv2 .one-panel .big .mono{font-family:var(--mono);font-size:12px;color:var(--plate);font-weight:500;display:block;letter-spacing:.1em;margin-bottom:6px}
.bopv2 .one-panel ul{list-style:none;margin-top:16px;position:relative}
.bopv2 .one-panel li{font-family:var(--mono);font-size:12px;color:var(--paper-dim);padding:6px 0;display:flex;align-items:center;gap:9px;border-top:1px solid var(--line)}
.bopv2 .one-panel li::before{content:"→";color:var(--live)}
@media(max-width:820px){.bopv2 .frag{grid-template-columns:1fr}.bopv2 .frag-arrow{flex-direction:row}.bopv2 .frag-arrow .l{writing-mode:horizontal-tb;transform:none}}

/* modules */
.bopv2 .mods{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.bopv2 .mod{background:var(--ink-2);padding:22px 20px;transition:.2s;position:relative;min-height:172px}
.bopv2 .mod:hover{background:var(--panel)}
.bopv2 .mod .code{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--fog-2);position:absolute;top:16px;right:16px}
.bopv2 .mod .ico{width:28px;height:28px;color:var(--plate);margin-bottom:14px}
.bopv2 .mod h3{font-family:var(--disp);font-weight:600;font-size:17px;letter-spacing:-.01em}
.bopv2 .mod .items{margin-top:10px;font-size:12.5px;color:var(--fog);line-height:1.65;font-family:var(--mono)}
.bopv2 .mod .ai-tag{position:absolute;bottom:16px;left:20px;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;color:var(--live);display:flex;align-items:center;gap:5px;text-transform:uppercase}
.bopv2 .mod .ai-tag::before{content:"✦"}
@media(max-width:900px){.bopv2 .mods{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.bopv2 .mods{grid-template-columns:1fr}}

/* comparison */
.bopv2 .cmp{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.bopv2 .cmp .h{padding:16px 22px;font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.bopv2 .cmp .h.old{background:var(--ink-2);color:var(--fog-2)}
.bopv2 .cmp .h.new{background:rgba(245,197,24,.08);color:var(--plate)}
.bopv2 .cmp .r{padding:14px 22px;font-size:14px;background:var(--ink);display:flex;align-items:center;gap:10px}
.bopv2 .cmp .r.old{color:var(--fog);font-family:var(--mono);font-size:13px}
.bopv2 .cmp .r.old::before{content:"×";color:var(--alert);font-weight:700}
.bopv2 .cmp .r.new{color:var(--paper)}
.bopv2 .cmp .r.new::before{content:"✓";color:var(--live);font-weight:700}

/* scorecard */
.bopv2 .score{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
.bopv2 .score-list{display:flex;flex-direction:column;gap:14px}
.bopv2 .score-row{display:grid;grid-template-columns:180px 1fr 44px;align-items:center;gap:14px}
.bopv2 .score-row .k{font-size:13.5px;color:var(--paper-dim)}
.bopv2 .score-row .bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden}
.bopv2 .score-row .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--plate-deep),var(--plate));border-radius:3px;width:0;transition:width 1.1s cubic-bezier(.2,.8,.2,1)}
.bopv2 .score-row .v{font-family:var(--mono);font-size:12.5px;color:var(--plate);text-align:right}
.bopv2 .score-note{border-left:2px solid var(--plate);padding:6px 0 6px 20px}
.bopv2 .score-note h4{font-family:var(--disp);font-weight:600;font-size:19px;margin-bottom:10px}
.bopv2 .score-note p{color:var(--fog);font-size:14.5px;line-height:1.6}
@media(max-width:820px){.bopv2 .score{grid-template-columns:1fr;gap:32px}.bopv2 .score-row{grid-template-columns:130px 1fr 40px}}

/* cta */
.bopv2 .cta{padding:96px 0;text-align:center;position:relative;overflow:hidden}
.bopv2 .cta::before{content:"";position:absolute;inset:0;background:radial-gradient(600px 200px at 50% 0%,rgba(245,197,24,.1),transparent)}
.bopv2 .cta h2{font-family:var(--disp);font-weight:700;font-size:clamp(30px,4.4vw,52px);letter-spacing:-.025em;line-height:1.02;position:relative}
.bopv2 .cta p{color:var(--fog);margin-top:18px;font-size:17px;position:relative}
.bopv2 .cta .hero-cta{justify-content:center;margin-top:34px;position:relative}
.bopv2 .cta .fine{margin-top:22px;font-family:var(--mono);font-size:11px;color:var(--fog-2);letter-spacing:.05em;position:relative}

@media(prefers-reduced-motion:reduce){.bopv2 *{animation:none!important;transition:none!important}}
`

const MARKUP = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <div class="tagpill"><span class="d"></span>The AI operating platform for vehicle dealers</div>
      <h1>Run the whole lot<br>from <span class="plate-word">one console.</span></h1>
      <p class="lede">Plate to invoice, inventory to accounting, Marktplaats to Mobile.de — one login, one data model, one AI working every step.</p>
      <p class="sub">Purpose-built for the NL/BE/DE trade: RDW lookups, BTW margeregeling, afleverbon, and multichannel publishing, handled where the work already happens.</p>
      <div class="hero-cta">
        <a href="/en/contact" class="btn btn-primary">Book a demo →</a>
        <a href="#numbers" class="btn btn-ghost">See what it saves</a>
      </div>
    </div>
    <div class="console" id="console">
      <div class="console-bar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="title">workflow · intake → delivered</span>
        <span class="live-badge">AI live</span>
      </div>
      <div class="console-body" id="steps">
        <div class="step" data-i="0"><div class="ico">1</div><div><div class="who">dealer</div><div class="txt">VW Crafter on the lot — plate <span class="yellow">GX-482-K</span> scanned</div></div></div>
        <div class="step" data-i="1"><div class="ico">✦</div><div><div class="who ai">DES AI · RDW</div><div class="txt">Pulled <b>specs, registration, mass & APK</b> — draft record created</div></div></div>
        <div class="step" data-i="2"><div class="ico">✦</div><div><div class="who ai">DES AI · vision</div><div class="txt">14 photos <b>de-cluttered, balanced, watermarked</b></div></div></div>
        <div class="step" data-i="3"><div class="ico">✦</div><div><div class="who ai">DES AI · copy</div><div class="txt">Listing written in <span class="yellow">NL · EN · DE · FR · TR</span>, SEO-tuned</div></div></div>
        <div class="step" data-i="4"><div class="ico">✦</div><div><div class="who ai">DES AI · pricing</div><div class="txt">Suggested <b>€ 24.950</b> — 40 comparables, 11 days to sell</div></div></div>
        <div class="step" data-i="5"><div class="ico">↑</div><div><div class="who">publish</div><div class="txt">Pushed to <b>Marktplaats · Mobile.de · AutoScout24</b> + website</div></div></div>
        <div class="step" data-i="6"><div class="ico">✦</div><div><div class="who ai">DES AI · CRM</div><div class="txt">Lead in. <b>Reply drafted</b>, test-drive slot proposed</div></div></div>
        <div class="step" data-i="7"><div class="ico">✓</div><div><div class="who">finance</div><div class="txt">Sold. <b>Margeregeling invoice + afleverbon</b>, boekhouding updated</div></div></div>
      </div>
      <div class="console-foot"><span id="footlabel">idle · press play</span><span class="prog" id="prog"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
    </div>
  </div>
</section>

<section class="econ" id="numbers">
  <div class="wrap">
    <div class="econ-head">
      <div class="t">What it's worth to a mid-size lot — <b>25 cars a month.</b></div>
      <div class="note">conservative model · override every input in the live calculator</div>
    </div>
    <div class="stat-row">
      <div class="stat hl">
        <div class="k">Net saving / year</div>
        <div class="n"><span class="cur">€</span>46.187</div>
        <div class="sub">Hard cash after the subscription — tools, labour, faster turn.</div>
      </div>
      <div class="stat green">
        <div class="k">Net profit uplift</div>
        <div class="n">+34%</div>
        <div class="sub">At a thin 2.5% margin, the euros land as a big percentage. +56% with growth.</div>
      </div>
      <div class="stat">
        <div class="k">Hours reclaimed / month</div>
        <div class="n">91</div>
        <div class="sub">AI does spec import, copy, translation, photos, publishing, follow-up.</div>
      </div>
      <div class="stat">
        <div class="k">Return per € 1 spent</div>
        <div class="n"><span class="cur">€</span>12</div>
        <div class="sub">Hard benefit only. Payback inside the first month.</div>
      </div>
    </div>
    <div style="margin-top:20px"><a href="/en/platform/calculator" class="btn btn-primary">Open the savings calculator →</a></div>
  </div>
</section>

<div class="strip">
  <div class="wrap strip-inner">
    <span class="lbl">Built across the trade</span>
    <span class="chip">Commercial vans</span><span class="chip">Cars</span><span class="chip">Campers</span>
    <span class="chip">Motorhomes</span><span class="chip">Auction stock</span><span class="chip">Fleet</span><span class="chip">Import / Export</span>
  </div>
</div>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">Inside the platform</div>
      <h2>One shell. Eight domains. The full dealer lifecycle.</h2>
      <p>Every module shares the same records, permissions, and AI layer — no switching, no re-typing, no export-import between systems.</p>
    </div>
    <div class="split">
      <div class="copy">
        <div class="eyebrow">The console</div>
        <h3>A fixed shell your team learns once.</h3>
        <p>SAP-grade structure without the SAP overhead. Six-anchor shell bar, permissioned left-nav, object codes on every screen — the operators' interface, not a consumer app dressed up.</p>
        <ul>
          <li>Overview · Operations · Sales & CRM domains</li>
          <li>Marketplace · Finance · Intelligence</li>
          <li>Master Data · Tools — all in one tree</li>
          <li>Role-based access on every object</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">bop.desmobil.com / console</span></div>
          <div class="mock-nav">
            <div class="mn-side">
              <div class="mn-group">Overview</div>
              <div class="mn-item sel"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>Exec Dashboard<span class="code">AN001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Conversion Funnel<span class="code">AN002</span></div>
              <div class="mn-group">Operations</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>Inventory<span class="code">AS001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Catalog<span class="code">IN001</span></div>
              <div class="mn-group">Sales & CRM</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 015-5h2"/></svg>Leads<span class="code">CR001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>Appointments<span class="code">SA007</span></div>
            </div>
            <div class="mn-main">
              <div class="mn-crumb">Overview / <b>Exec Dashboard</b></div>
              <div class="mn-tiles">
                <div class="mn-tile"><div class="tk">STOCK</div><div class="tn">47</div><div class="ts">units live</div></div>
                <div class="mn-tile"><div class="tk">SOLD · MTD</div><div class="tn">23</div><div class="ts">+4 vs target</div></div>
                <div class="mn-tile"><div class="tk">AVG DAYS</div><div class="tn">18</div><div class="ts">−6 with AI</div></div>
                <div class="mn-tile"><div class="tk">LEADS</div><div class="tn">61</div><div class="ts">14 open</div></div>
                <div class="mn-tile"><div class="tk">GROSS · MTD</div><div class="tn" style="font-size:14px">€41k</div><div class="ts">margeregeling</div></div>
                <div class="mn-tile"><div class="tk">PUBLISHED</div><div class="tn">188</div><div class="ts">4 channels</div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="snap-cap">Exec Dashboard — the live shell, object codes and all</div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">Not a chatbot in the corner</div>
      <h2>An <span style="color:var(--live)">Ask AI</span> panel lives on every record.</h2>
      <p>Context-aware, never a blank box. The AI already knows which vehicle, which lead, which report you're on — so the action is one tap, and the data behind it stays a single source of truth.</p>
    </div>
    <div class="split rev">
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">console / inventory · Listing Manager · MP001</span></div>
          <div class="mock-grid">
            <div class="mg-toolbar">
              <span class="search">⌕ filter stock…</span>
              <span class="b">▤ columns</span>
              <span class="b ai">✦ Ask AI</span>
            </div>
            <table class="mg-table">
              <thead><tr><th>Object</th><th>Vehicle</th><th>Plate</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td class="pk">VH-1048</td><td>VW Crafter L3H2</td><td>GX-482-K</td><td>€ 24.950</td><td><span class="badge live">live · 3ch</span></td></tr>
                <tr><td class="pk">VH-1047</td><td>Mercedes Sprinter</td><td>PJ-119-T</td><td>€ 31.500</td><td><span class="badge live">live · 3ch</span></td></tr>
                <tr><td class="pk">VH-1046</td><td>Ford Transit Custom</td><td>RN-770-B</td><td>€ 18.200</td><td><span class="badge draft">draft · AI</span></td></tr>
                <tr><td class="pk">VH-1045</td><td>Renault Master</td><td>SD-205-L</td><td>€ 16.900</td><td><span class="badge sold">sold</span></td></tr>
                <tr><td class="pk">VH-1044</td><td>Fiat Ducato Maxi</td><td>TK-431-M</td><td>€ 21.750</td><td><span class="badge live">live · 4ch</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="snap-cap">Listing Manager — SE16-style grid, AI on the toolbar</div>
      </div>
      <div class="copy">
        <div class="eyebrow">Ask AI · in context</div>
        <h3>Every button can be AI-powered.</h3>
        <p>Pick a vehicle and the panel already knows it. No copy-pasting into a separate tab, no re-describing the car to a generic assistant.</p>
        <div class="snap" style="margin-top:16px">
          <div class="mock-ai">
            <div class="mai-head"><span class="spark">✦</span><span class="t">DES AI</span><span class="ctx">context · VH-1048</span></div>
            <div class="mai-body">
              <div class="mai-ctxcard"><div class="l">Selected vehicle</div><div class="v">VW Crafter L3H2 · <span class="plate">GX-482-K</span></div></div>
              <div class="mai-actions">
                <div class="mai-act"><span class="i">✎</span>Write the listing, translate to 5 languages<span class="go">run</span></div>
                <div class="mai-act"><span class="i">◈</span>Suggest asking price from live comparables<span class="go">run</span></div>
                <div class="mai-act"><span class="i">⇄</span>Find similar vehicles in my stock<span class="go">run</span></div>
                <div class="mai-act"><span class="i">↑</span>Publish to the channels most likely to sell it<span class="go">run</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">The stack you're paying for</div>
      <h2>You don't need more software. You need it to stop being twelve things.</h2>
      <p>Every quote copied by hand, every listing re-uploaded per channel, every number re-typed into accounting. The tax isn't the subscriptions — it's the switching.</p>
    </div>
    <div class="frag">
      <div>
        <div class="col-h">Today · a dealer's desktop</div>
        <div class="tool-cloud">
          <span>Excel stock</span><span>WhatsApp</span><span>Outlook</span><span>Mobile.de</span><span>AutoScout24</span><span>Marktplaats</span><span>Accounting</span><span>Invoice tool</span><span>CRM</span><span>Google Drive</span><span>Photo editor</span><span>ChatGPT tab</span>
        </div>
      </div>
      <div class="frag-arrow"><div class="l">consolidates into</div><div class="a">→</div></div>
      <div>
        <div class="col-h">On DES BOP V2</div>
        <div class="one-panel">
          <div class="big"><span class="mono">ONE PLATFORM</span>Everything, connected.</div>
          <ul><li>One data model — no re-typing</li><li>One publish click — every channel</li><li>One assistant — inside every screen</li><li>One invoice flow — BTW handled</li></ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="pad" id="modules">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">The platform · built and shipped</div>
      <h2>Eight domains. One console. Nothing bolted on.</h2>
      <p>This is the live navigation, not a roadmap. Each domain shares records, permissions, and the AI layer.</p>
    </div>
    <div class="mods">
      <div class="mod"><div class="code">AN·BO</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg><h3>Overview</h3><div class="items">Exec dashboard · Conversion funnel · Session intelligence · Listing performance</div><div class="ai-tag">AI insights</div></div>
      <div class="mod"><div class="code">AS·IN</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg><h3>Inventory</h3><div class="items">Catalog · Brands · Categories · Suppliers · Model catalog · Taxonomy</div><div class="ai-tag">AI spec import</div></div>
      <div class="mod"><div class="code">MP·PB·AU</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v4H4z"/><path d="M6 8v12h12V8"/><path d="M9 12h6"/></svg><h3>Marketplace</h3><div class="items">Listing manager · Channel publisher · Publish queue · Auction manager</div><div class="ai-tag">AI channel routing</div></div>
      <div class="mod"><div class="code">CR·SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M17 11l2 2 4-4"/></svg><h3>Sales & CRM</h3><div class="items">Leads · Pipeline · Appointments · Reviews · Rentals · Buyer inbox</div><div class="ai-tag">AI follow-up</div></div>
      <div class="mod"><div class="code">SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg><h3>Sales flow</h3><div class="items">Quotations · Quote builder · Orders · Payments · Contracts</div><div class="ai-tag">AI quoting</div></div>
      <div class="mod"><div class="code">FI</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg><h3>Finance</h3><div class="items">BTW quick calc · Bon scanner · Supplier AP · Payment tracking · Winst & verlies</div><div class="ai-tag">BTW assistent AI</div></div>
      <div class="mod"><div class="code">AI·MK</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg><h3>Intelligence</h3><div class="items">Command center · Market evaluation · Competitor activity · Prompt manager · Action audit</div><div class="ai-tag">AI core</div></div>
      <div class="mod"><div class="code">MD·OP</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l9 4-9 4-9-4 9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg><h3>Data & Tools</h3><div class="items">Business partners · Vehicle taxonomy · QR · Flyer builder · Watermark · Photo enhance</div><div class="ai-tag">AI photo tools</div></div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="split">
      <div class="copy">
        <div class="eyebrow">Create once · publish everywhere</div>
        <h3>From plate scan to five languages, in one pass.</h3>
        <p>Scan the plate, and RDW fills the specs. AI cleans the photos, writes the copy, prices it against live comparables, and pushes it to every channel — the dealer approves, doesn't type.</p>
        <ul>
          <li>RDW auto-fill on plate lookup</li>
          <li>Photos enhanced and watermarked</li>
          <li>Copy + SEO in NL · EN · DE · FR · TR</li>
          <li>One publish click across four channels</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">listing · VH-1048 · ready to publish</span></div>
          <div class="mock-list">
            <div class="ml-top">
              <div class="ml-photo"><span class="car"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20h40M6 20l3-9h20l6 6h5v3M11 20a3 3 0 106 0M29 20a3 3 0 106 0"/></svg></span></div>
              <div class="ml-info">
                <div class="tt">VW Crafter L3H2 2.0 TDI</div>
                <div class="meta">2021 · 84.500 km · diesel · GX-482-K</div>
                <div class="price">€ 24.950 <small>✦ AI-priced · 11d to sell</small></div>
              </div>
            </div>
            <div class="ml-langs">
              <span class="ml-lang on">NL</span><span class="ml-lang on">EN</span><span class="ml-lang on">DE</span><span class="ml-lang on">FR</span><span class="ml-lang on">TR</span><span class="ml-lang">✦ generated</span>
            </div>
            <div class="ml-chan">
              <span>Marktplaats</span><span>Mobile.de</span><span>AutoScout24</span><span>Website</span>
            </div>
          </div>
        </div>
        <div class="snap-cap">Listing detail — AI-written, AI-priced, one click to four channels</div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">Before / after</div><h2>What actually changes on a Tuesday morning.</h2></div>
    <div class="cmp">
      <div class="h old">The way it works now</div><div class="h new">On DES BOP V2</div>
      <div class="r old">Twelve subscriptions, twelve logins</div><div class="r new">One platform, one login</div>
      <div class="r old">Type the listing, then re-type it per site</div><div class="r new">AI writes it once, six languages</div>
      <div class="r old">Upload photos to each marketplace by hand</div><div class="r new">One publish click, every channel</div>
      <div class="r old">Stock lives in a spreadsheet nobody trusts</div><div class="r new">Live inventory, single source of truth</div>
      <div class="r old">Chase leads from memory</div><div class="r new">AI drafts the follow-up on time</div>
      <div class="r old">BTW margeregeling worked out by hand</div><div class="r new">BTW assistent handles the margin invoice</div>
    </div>
  </div>
</section>

<section class="pad" id="score">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">Honest evaluation</div><h2>Where the platform stands today.</h2><p>Coverage is enterprise-grade. The gap was never the product — it was the story on the way in.</p></div>
    <div class="score">
      <div class="score-list" id="scorelist">
        <div class="score-row"><span class="k">Functional coverage</span><span class="bar"><i data-w="97"></i></span><span class="v">9.7</span></div>
        <div class="score-row"><span class="k">Dealer-specific fit</span><span class="bar"><i data-w="98"></i></span><span class="v">9.8</span></div>
        <div class="score-row"><span class="k">ERP capabilities</span><span class="bar"><i data-w="95"></i></span><span class="v">9.5</span></div>
        <div class="score-row"><span class="k">Marketplace integration</span><span class="bar"><i data-w="100"></i></span><span class="v">10</span></div>
        <div class="score-row"><span class="k">AI readiness</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">UX simplicity</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">Marketing clarity</span><span class="bar"><i data-w="90"></i></span><span class="v">9.0</span></div>
      </div>
      <div class="score-note">
        <h4>The weakest part was explaining it. This page fixes that.</h4>
        <p>Lead with the money and the live console, in the trade's own vocabulary, and the value is shown before it's claimed. A dealer stops thinking "another DMS" and starts thinking "this replaces half my stack."</p>
      </div>
    </div>
  </div>
</section>

<section class="cta" id="cta">
  <div class="wrap">
    <h2>Run your entire dealership.<br>Powered by AI.</h2>
    <p>From plate scan to afleverbon — see it move your real stock in one session.</p>
    <div class="hero-cta">
      <a href="/en/contact" class="btn btn-primary">Book a demo →</a>
      <a href="/en/platform/calculator" class="btn btn-ghost">Open the savings calculator</a>
    </div>
    <div class="fine">No migration marathon · your data model, your channels, your language</div>
  </div>
</section>
`

const MARKUP_NL = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <div class="tagpill"><span class="d"></span>Het AI-platform voor autobedrijven</div>
      <h1>Run je hele terrein<br>vanuit <span class="plate-word">één console.</span></h1>
      <p class="lede">Van kenteken tot factuur, van voorraad tot boekhouding, van Marktplaats tot Mobile.de — één login, één datamodel, één AI die bij elke stap meewerkt.</p>
      <p class="sub">Gebouwd voor de NL/BE/DE-handel: RDW-opvragingen, BTW-margeregeling, afleverbon en publiceren op meerdere kanalen — precies waar het werk al gebeurt.</p>
      <div class="hero-cta">
        <a href="/nl/contact" class="btn btn-primary">Plan een demo →</a>
        <a href="#numbers" class="btn btn-ghost">Bekijk wat het bespaart</a>
      </div>
    </div>
    <div class="console" id="console">
      <div class="console-bar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="title">workflow · inname → afgeleverd</span>
        <span class="live-badge">AI live</span>
      </div>
      <div class="console-body" id="steps">
        <div class="step" data-i="0"><div class="ico">1</div><div><div class="who">dealer</div><div class="txt">VW Crafter op het terrein — kenteken <span class="yellow">GX-482-K</span> gescand</div></div></div>
        <div class="step" data-i="1"><div class="ico">✦</div><div><div class="who ai">DES AI · RDW</div><div class="txt"><b>Specs, registratie, massa & APK</b> opgehaald — conceptrecord aangemaakt</div></div></div>
        <div class="step" data-i="2"><div class="ico">✦</div><div><div class="who ai">DES AI · beeld</div><div class="txt">14 foto's <b>opgeschoond, gebalanceerd, gewatermerkt</b></div></div></div>
        <div class="step" data-i="3"><div class="ico">✦</div><div><div class="who ai">DES AI · tekst</div><div class="txt">Advertentie geschreven in <span class="yellow">NL · EN · DE · FR · TR</span>, SEO-geoptimaliseerd</div></div></div>
        <div class="step" data-i="4"><div class="ico">✦</div><div><div class="who ai">DES AI · prijs</div><div class="txt">Voorgesteld <b>€ 24.950</b> — 40 vergelijkbare, 11 dagen tot verkoop</div></div></div>
        <div class="step" data-i="5"><div class="ico">↑</div><div><div class="who">publiceren</div><div class="txt">Gepubliceerd op <b>Marktplaats · Mobile.de · AutoScout24</b> + website</div></div></div>
        <div class="step" data-i="6"><div class="ico">✦</div><div><div class="who ai">DES AI · CRM</div><div class="txt">Lead binnen. <b>Antwoord opgesteld</b>, proefrit voorgesteld</div></div></div>
        <div class="step" data-i="7"><div class="ico">✓</div><div><div class="who">financiën</div><div class="txt">Verkocht. <b>Margeregeling-factuur + afleverbon</b>, boekhouding bijgewerkt</div></div></div>
      </div>
      <div class="console-foot"><span id="footlabel">inactief · druk op play</span><span class="prog" id="prog"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
    </div>
  </div>
</section>

<section class="econ" id="numbers">
  <div class="wrap">
    <div class="econ-head">
      <div class="t">Wat het waard is voor een middelgroot terrein — <b>25 auto's per maand.</b></div>
      <div class="note">conservatief model · pas elke waarde aan in de rekentool</div>
    </div>
    <div class="stat-row">
      <div class="stat hl"><div class="k">Netto besparing / jaar</div><div class="n"><span class="cur">€</span>46.187</div><div class="sub">Harde cash na het abonnement — tools, arbeid, snellere doorloop.</div></div>
      <div class="stat green"><div class="k">Nettowinst-stijging</div><div class="n">+34%</div><div class="sub">Bij een dunne marge van 2,5% telt elke euro flink door. +56% met groei.</div></div>
      <div class="stat"><div class="k">Uren teruggewonnen / maand</div><div class="n">91</div><div class="sub">AI doet spec-import, tekst, vertaling, foto's, publiceren, opvolging.</div></div>
      <div class="stat"><div class="k">Rendement per € 1</div><div class="n"><span class="cur">€</span>12</div><div class="sub">Alleen harde waarde. Terugverdiend binnen de eerste maand.</div></div>
    </div>
    <div style="margin-top:20px"><a href="/nl/platform/calculator" class="btn btn-primary">Open de besparingscalculator →</a></div>
  </div>
</section>

<div class="strip">
  <div class="wrap strip-inner">
    <span class="lbl">Door de hele handel gebouwd</span>
    <span class="chip">Bedrijfswagens</span><span class="chip">Auto's</span><span class="chip">Campers</span>
    <span class="chip">Kampeerauto's</span><span class="chip">Veilingvoorraad</span><span class="chip">Wagenpark</span><span class="chip">Import / Export</span>
  </div>
</div>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">In het platform</div>
      <h2>Eén schil. Acht domeinen. De volledige dealer-lifecycle.</h2>
      <p>Elke module deelt dezelfde records, rechten en AI-laag — geen wisselen, geen overtypen, geen export-import tussen systemen.</p>
    </div>
    <div class="split">
      <div class="copy">
        <div class="eyebrow">De console</div>
        <h3>Een vaste schil die je team één keer leert.</h3>
        <p>SAP-degelijke structuur zonder de SAP-overhead. Zes-anker balk, links een menu op rechten, objectcodes op elk scherm — de interface voor operators, geen opgepoetste consumenten-app.</p>
        <ul>
          <li>Overzicht · Operatie · Sales & CRM-domeinen</li>
          <li>Marktplaats · Financiën · Intelligence</li>
          <li>Stamgegevens · Tools — in één boom</li>
          <li>Rolgebaseerde toegang op elk object</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">bop.desmobil.com / console</span></div>
          <div class="mock-nav">
            <div class="mn-side">
              <div class="mn-group">Overzicht</div>
              <div class="mn-item sel"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>Exec Dashboard<span class="code">AN001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Conversietrechter<span class="code">AN002</span></div>
              <div class="mn-group">Operatie</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>Voorraad<span class="code">AS001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Catalogus<span class="code">IN001</span></div>
              <div class="mn-group">Sales & CRM</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 015-5h2"/></svg>Leads<span class="code">CR001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>Afspraken<span class="code">SA007</span></div>
            </div>
            <div class="mn-main">
              <div class="mn-crumb">Overzicht / <b>Exec Dashboard</b></div>
              <div class="mn-tiles">
                <div class="mn-tile"><div class="tk">VOORRAAD</div><div class="tn">47</div><div class="ts">stuks live</div></div>
                <div class="mn-tile"><div class="tk">VERKOCHT · MTD</div><div class="tn">23</div><div class="ts">+4 vs doel</div></div>
                <div class="mn-tile"><div class="tk">GEM. DAGEN</div><div class="tn">18</div><div class="ts">−6 met AI</div></div>
                <div class="mn-tile"><div class="tk">LEADS</div><div class="tn">61</div><div class="ts">14 open</div></div>
                <div class="mn-tile"><div class="tk">BRUTO · MTD</div><div class="tn" style="font-size:14px">€41k</div><div class="ts">margeregeling</div></div>
                <div class="mn-tile"><div class="tk">GEPUBL.</div><div class="tn">188</div><div class="ts">4 kanalen</div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="snap-cap">Exec Dashboard — de live schil, inclusief objectcodes</div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">Geen chatbot in de hoek</div>
      <h2>Een <span style="color:var(--live)">Ask AI</span>-paneel op elk record.</h2>
      <p>Contextbewust, nooit een leeg vak. De AI weet al welk voertuig, welke lead, welk rapport je bekijkt — dus de actie is één tik, en de data eronder blijft één bron van waarheid.</p>
    </div>
    <div class="split rev">
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">console / voorraad · Advertentiebeheer · MP001</span></div>
          <div class="mock-grid">
            <div class="mg-toolbar">
              <span class="search">⌕ filter voorraad…</span>
              <span class="b">▤ kolommen</span>
              <span class="b ai">✦ Ask AI</span>
            </div>
            <table class="mg-table">
              <thead><tr><th>Object</th><th>Voertuig</th><th>Kenteken</th><th>Prijs</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td class="pk">VH-1048</td><td>VW Crafter L3H2</td><td>GX-482-K</td><td>€ 24.950</td><td><span class="badge live">live · 3k</span></td></tr>
                <tr><td class="pk">VH-1047</td><td>Mercedes Sprinter</td><td>PJ-119-T</td><td>€ 31.500</td><td><span class="badge live">live · 3k</span></td></tr>
                <tr><td class="pk">VH-1046</td><td>Ford Transit Custom</td><td>RN-770-B</td><td>€ 18.200</td><td><span class="badge draft">concept · AI</span></td></tr>
                <tr><td class="pk">VH-1045</td><td>Renault Master</td><td>SD-205-L</td><td>€ 16.900</td><td><span class="badge sold">verkocht</span></td></tr>
                <tr><td class="pk">VH-1044</td><td>Fiat Ducato Maxi</td><td>TK-431-M</td><td>€ 21.750</td><td><span class="badge live">live · 4k</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="snap-cap">Advertentiebeheer — SE16-achtige grid, AI op de werkbalk</div>
      </div>
      <div class="copy">
        <div class="eyebrow">Ask AI · in context</div>
        <h3>Elke knop kan AI-aangedreven zijn.</h3>
        <p>Kies een voertuig en het paneel kent het al. Geen kopiëren naar een apart tabblad, geen auto opnieuw beschrijven aan een generieke assistent.</p>
        <div class="snap" style="margin-top:16px">
          <div class="mock-ai">
            <div class="mai-head"><span class="spark">✦</span><span class="t">DES AI</span><span class="ctx">context · VH-1048</span></div>
            <div class="mai-body">
              <div class="mai-ctxcard"><div class="l">Geselecteerd voertuig</div><div class="v">VW Crafter L3H2 · <span class="plate">GX-482-K</span></div></div>
              <div class="mai-actions">
                <div class="mai-act"><span class="i">✎</span>Schrijf de advertentie, vertaal naar 5 talen<span class="go">run</span></div>
                <div class="mai-act"><span class="i">◈</span>Stel vraagprijs voor uit live vergelijkbare<span class="go">run</span></div>
                <div class="mai-act"><span class="i">⇄</span>Vind vergelijkbare voertuigen in mijn voorraad<span class="go">run</span></div>
                <div class="mai-act"><span class="i">↑</span>Publiceer op de kanalen die dit het snelst verkopen<span class="go">run</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">De stack waar je voor betaalt</div>
      <h2>Je hebt geen extra software nodig. Je hebt nodig dat het stopt met twaalf dingen te zijn.</h2>
      <p>Elke offerte met de hand overgetypt, elke advertentie per kanaal opnieuw geüpload, elk getal opnieuw in de boekhouding getikt. De last zijn niet de abonnementen — het is het schakelen.</p>
    </div>
    <div class="frag">
      <div>
        <div class="col-h">Vandaag · het bureaublad van een dealer</div>
        <div class="tool-cloud">
          <span>Excel-voorraad</span><span>WhatsApp</span><span>Outlook</span><span>Mobile.de</span><span>AutoScout24</span><span>Marktplaats</span><span>Boekhouding</span><span>Facturatietool</span><span>CRM</span><span>Google Drive</span><span>Foto-editor</span><span>ChatGPT-tab</span>
        </div>
      </div>
      <div class="frag-arrow"><div class="l">gaat samen in</div><div class="a">→</div></div>
      <div>
        <div class="col-h">Op DES BOP V2</div>
        <div class="one-panel">
          <div class="big"><span class="mono">ÉÉN PLATFORM</span>Alles, verbonden.</div>
          <ul><li>Eén datamodel — geen overtypen</li><li>Eén publiceerklik — elk kanaal</li><li>Eén assistent — in elk scherm</li><li>Eén factuurstroom — BTW geregeld</li></ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="pad" id="modules">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">Het platform · gebouwd en uitgerold</div>
      <h2>Acht domeinen. Eén console. Niets erbij geplakt.</h2>
      <p>Dit is de live navigatie, geen roadmap. Elk domein deelt records, rechten en de AI-laag.</p>
    </div>
    <div class="mods">
      <div class="mod"><div class="code">AN·BO</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg><h3>Overzicht</h3><div class="items">Exec dashboard · Conversietrechter · Sessie-intelligentie · Advertentieprestaties</div><div class="ai-tag">AI-inzichten</div></div>
      <div class="mod"><div class="code">AS·IN</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg><h3>Voorraad</h3><div class="items">Catalogus · Merken · Categorieën · Leveranciers · Modelcatalogus · Taxonomie</div><div class="ai-tag">AI spec-import</div></div>
      <div class="mod"><div class="code">MP·PB·AU</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v4H4z"/><path d="M6 8v12h12V8"/><path d="M9 12h6"/></svg><h3>Marktplaats</h3><div class="items">Advertentiebeheer · Kanaalpublicatie · Publicatiewachtrij · Veilingbeheer</div><div class="ai-tag">AI-kanaalrouting</div></div>
      <div class="mod"><div class="code">CR·SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M17 11l2 2 4-4"/></svg><h3>Sales & CRM</h3><div class="items">Leads · Pijplijn · Afspraken · Reviews · Verhuur · Kopers-inbox</div><div class="ai-tag">AI-opvolging</div></div>
      <div class="mod"><div class="code">SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg><h3>Verkoopstroom</h3><div class="items">Offertes · Offertebouwer · Orders · Betalingen · Contracten</div><div class="ai-tag">AI-offertes</div></div>
      <div class="mod"><div class="code">FI</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg><h3>Financiën</h3><div class="items">BTW-snelrekenaar · Bonscanner · Inkoop AP · Betaaltracking · Winst & verlies</div><div class="ai-tag">BTW-assistent AI</div></div>
      <div class="mod"><div class="code">AI·MK</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg><h3>Intelligence</h3><div class="items">Command center · Marktevaluatie · Concurrentie-activiteit · Prompt-beheer · Actie-audit</div><div class="ai-tag">AI-kern</div></div>
      <div class="mod"><div class="code">MD·OP</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l9 4-9 4-9-4 9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg><h3>Data & Tools</h3><div class="items">Zakenrelaties · Voertuigtaxonomie · QR · Flyer-bouwer · Watermerk · Foto-verbetering</div><div class="ai-tag">AI-fototools</div></div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="split">
      <div class="copy">
        <div class="eyebrow">Eén keer maken · overal publiceren</div>
        <h3>Van kentekenscan tot vijf talen, in één keer.</h3>
        <p>Scan het kenteken en RDW vult de specs. AI schoont de foto's op, schrijft de tekst, prijst tegen live vergelijkbare en pusht naar elk kanaal — de dealer keurt goed, typt niet.</p>
        <ul>
          <li>RDW-autofill bij kentekenopvraging</li>
          <li>Foto's verbeterd en gewatermerkt</li>
          <li>Tekst + SEO in NL · EN · DE · FR · TR</li>
          <li>Eén publiceerklik over vier kanalen</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">advertentie · VH-1048 · klaar om te publiceren</span></div>
          <div class="mock-list">
            <div class="ml-top">
              <div class="ml-photo"><span class="car"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20h40M6 20l3-9h20l6 6h5v3M11 20a3 3 0 106 0M29 20a3 3 0 106 0"/></svg></span></div>
              <div class="ml-info">
                <div class="tt">VW Crafter L3H2 2.0 TDI</div>
                <div class="meta">2021 · 84.500 km · diesel · GX-482-K</div>
                <div class="price">€ 24.950 <small>✦ AI-geprijsd · 11d tot verkoop</small></div>
              </div>
            </div>
            <div class="ml-langs">
              <span class="ml-lang on">NL</span><span class="ml-lang on">EN</span><span class="ml-lang on">DE</span><span class="ml-lang on">FR</span><span class="ml-lang on">TR</span><span class="ml-lang">✦ gegenereerd</span>
            </div>
            <div class="ml-chan">
              <span>Marktplaats</span><span>Mobile.de</span><span>AutoScout24</span><span>Website</span>
            </div>
          </div>
        </div>
        <div class="snap-cap">Advertentiedetail — AI-geschreven, AI-geprijsd, één klik naar vier kanalen</div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">Voor / na</div><h2>Wat er echt verandert op een dinsdagochtend.</h2></div>
    <div class="cmp">
      <div class="h old">Hoe het nu werkt</div><div class="h new">Op DES BOP V2</div>
      <div class="r old">Twaalf abonnementen, twaalf logins</div><div class="r new">Eén platform, één login</div>
      <div class="r old">Advertentie typen, dan per site overtypen</div><div class="r new">AI schrijft het één keer, zes talen</div>
      <div class="r old">Foto's met de hand naar elke marktplaats uploaden</div><div class="r new">Eén publiceerklik, elk kanaal</div>
      <div class="r old">Voorraad in een spreadsheet die niemand vertrouwt</div><div class="r new">Live voorraad, één bron van waarheid</div>
      <div class="r old">Leads uit je hoofd achtervolgen</div><div class="r new">AI stelt de opvolging op tijd op</div>
      <div class="r old">BTW-margeregeling met de hand uitrekenen</div><div class="r new">BTW-assistent maakt de margefactuur</div>
    </div>
  </div>
</section>

<section class="pad" id="score">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">Eerlijke evaluatie</div><h2>Waar het platform vandaag staat.</h2><p>De dekking is enterprise-waardig. Het gat was nooit het product — het was het verhaal bij binnenkomst.</p></div>
    <div class="score">
      <div class="score-list" id="scorelist">
        <div class="score-row"><span class="k">Functionele dekking</span><span class="bar"><i data-w="97"></i></span><span class="v">9.7</span></div>
        <div class="score-row"><span class="k">Dealer-specifieke pasvorm</span><span class="bar"><i data-w="98"></i></span><span class="v">9.8</span></div>
        <div class="score-row"><span class="k">ERP-mogelijkheden</span><span class="bar"><i data-w="95"></i></span><span class="v">9.5</span></div>
        <div class="score-row"><span class="k">Marktplaats-integratie</span><span class="bar"><i data-w="100"></i></span><span class="v">10</span></div>
        <div class="score-row"><span class="k">AI-gereedheid</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">UX-eenvoud</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">Marketing-duidelijkheid</span><span class="bar"><i data-w="90"></i></span><span class="v">9.0</span></div>
      </div>
      <div class="score-note">
        <h4>Het zwakste deel was de uitleg. Deze pagina lost dat op.</h4>
        <p>Begin met het geld en de live console, in de taal van de handel, en de waarde wordt getoond vóór ze wordt geclaimd. Een dealer denkt niet meer "weer een DMS" maar "dit vervangt de helft van mijn stack".</p>
      </div>
    </div>
  </div>
</section>

<section class="cta" id="cta">
  <div class="wrap">
    <h2>Run je hele autobedrijf.<br>Aangedreven door AI.</h2>
    <p>Van kentekenscan tot afleverbon — zie het je echte voorraad verplaatsen in één sessie.</p>
    <div class="hero-cta">
      <a href="/nl/contact" class="btn btn-primary">Plan een demo →</a>
      <a href="/nl/platform/calculator" class="btn btn-ghost">Open de besparingscalculator</a>
    </div>
    <div class="fine">Geen migratiemarathon · jouw datamodel, jouw kanalen, jouw taal</div>
  </div>
</section>
`

const MARKUP_DE = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <div class="tagpill"><span class="d"></span>Die KI-Plattform für Fahrzeughändler</div>
      <h1>Führe den ganzen Hof<br>über <span class="plate-word">eine Konsole.</span></h1>
      <p class="lede">Vom Kennzeichen zur Rechnung, vom Bestand zur Buchhaltung, von Marktplaats bis Mobile.de — ein Login, ein Datenmodell, eine KI bei jedem Schritt.</p>
      <p class="sub">Gebaut für den NL/BE/DE-Handel: RDW-Abfragen, Differenzbesteuerung, Lieferschein und Multichannel-Veröffentlichung — genau dort, wo die Arbeit passiert.</p>
      <div class="hero-cta">
        <a href="/de/contact" class="btn btn-primary">Demo buchen →</a>
        <a href="#numbers" class="btn btn-ghost">Sehen, was es spart</a>
      </div>
    </div>
    <div class="console" id="console">
      <div class="console-bar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="title">Workflow · Annahme → ausgeliefert</span>
        <span class="live-badge">KI live</span>
      </div>
      <div class="console-body" id="steps">
        <div class="step" data-i="0"><div class="ico">1</div><div><div class="who">Händler</div><div class="txt">VW Crafter auf dem Hof — Kennzeichen <span class="yellow">GX-482-K</span> gescannt</div></div></div>
        <div class="step" data-i="1"><div class="ico">✦</div><div><div class="who ai">DES KI · RDW</div><div class="txt"><b>Specs, Zulassung, Masse & TÜV</b> abgerufen — Entwurf angelegt</div></div></div>
        <div class="step" data-i="2"><div class="ico">✦</div><div><div class="who ai">DES KI · Vision</div><div class="txt">14 Fotos <b>bereinigt, ausbalanciert, mit Wasserzeichen</b></div></div></div>
        <div class="step" data-i="3"><div class="ico">✦</div><div><div class="who ai">DES KI · Text</div><div class="txt">Anzeige verfasst in <span class="yellow">NL · EN · DE · FR · TR</span>, SEO-optimiert</div></div></div>
        <div class="step" data-i="4"><div class="ico">✦</div><div><div class="who ai">DES KI · Preis</div><div class="txt">Vorschlag <b>€ 24.950</b> — 40 Vergleichswerte, 11 Tage bis Verkauf</div></div></div>
        <div class="step" data-i="5"><div class="ico">↑</div><div><div class="who">veröffentlichen</div><div class="txt">Veröffentlicht auf <b>Marktplaats · Mobile.de · AutoScout24</b> + Website</div></div></div>
        <div class="step" data-i="6"><div class="ico">✦</div><div><div class="who ai">DES KI · CRM</div><div class="txt">Lead da. <b>Antwort entworfen</b>, Probefahrt vorgeschlagen</div></div></div>
        <div class="step" data-i="7"><div class="ico">✓</div><div><div class="who">Finanzen</div><div class="txt">Verkauft. <b>Differenzbesteuerungs-Rechnung + Lieferschein</b>, Buchhaltung aktualisiert</div></div></div>
      </div>
      <div class="console-foot"><span id="footlabel">inaktiv · Play drücken</span><span class="prog" id="prog"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
    </div>
  </div>
</section>

<section class="econ" id="numbers">
  <div class="wrap">
    <div class="econ-head">
      <div class="t">Was es einem mittelgroßen Hof bringt — <b>25 Autos pro Monat.</b></div>
      <div class="note">konservatives Modell · jeden Wert im Live-Rechner anpassen</div>
    </div>
    <div class="stat-row">
      <div class="stat hl"><div class="k">Nettoersparnis / Jahr</div><div class="n"><span class="cur">€</span>46.187</div><div class="sub">Harte Ersparnis nach dem Abo — Tools, Arbeit, schnellerer Umschlag.</div></div>
      <div class="stat green"><div class="k">Nettogewinn-Anstieg</div><div class="n">+34%</div><div class="sub">Bei dünnen 2,5% Marge schlägt jeder Euro stark durch. +56% mit Wachstum.</div></div>
      <div class="stat"><div class="k">Stunden zurückgewonnen / Monat</div><div class="n">91</div><div class="sub">KI erledigt Spec-Import, Text, Übersetzung, Fotos, Veröffentlichung, Nachfassen.</div></div>
      <div class="stat"><div class="k">Rendite pro € 1</div><div class="n"><span class="cur">€</span>12</div><div class="sub">Nur harter Nutzen. Amortisiert im ersten Monat.</div></div>
    </div>
    <div style="margin-top:20px"><a href="/de/platform/calculator" class="btn btn-primary">Sparrechner öffnen →</a></div>
  </div>
</section>

<div class="strip">
  <div class="wrap strip-inner">
    <span class="lbl">Über den ganzen Handel gebaut</span>
    <span class="chip">Transporter</span><span class="chip">Autos</span><span class="chip">Camper</span>
    <span class="chip">Wohnmobile</span><span class="chip">Auktionsbestand</span><span class="chip">Flotte</span><span class="chip">Import / Export</span>
  </div>
</div>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">In der Plattform</div>
      <h2>Eine Hülle. Acht Domänen. Der volle Händler-Lebenszyklus.</h2>
      <p>Jedes Modul teilt dieselben Datensätze, Rechte und KI-Schicht — kein Wechseln, kein Abtippen, kein Export-Import zwischen Systemen.</p>
    </div>
    <div class="split">
      <div class="copy">
        <div class="eyebrow">Die Konsole</div>
        <h3>Eine feste Hülle, die dein Team einmal lernt.</h3>
        <p>SAP-solide Struktur ohne den SAP-Overhead. Sechs-Anker-Leiste, rechtebasierte Navigation, Objektcodes auf jedem Screen — die Oberfläche für Operatoren, keine aufgehübschte Consumer-App.</p>
        <ul>
          <li>Übersicht · Betrieb · Sales & CRM</li>
          <li>Marktplatz · Finanzen · Intelligence</li>
          <li>Stammdaten · Tools — in einem Baum</li>
          <li>Rollenbasierter Zugriff auf jedes Objekt</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">bop.desmobil.com / console</span></div>
          <div class="mock-nav">
            <div class="mn-side">
              <div class="mn-group">Übersicht</div>
              <div class="mn-item sel"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>Exec Dashboard<span class="code">AN001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Conversion-Funnel<span class="code">AN002</span></div>
              <div class="mn-group">Betrieb</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>Bestand<span class="code">AS001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Katalog<span class="code">IN001</span></div>
              <div class="mn-group">Sales & CRM</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 015-5h2"/></svg>Leads<span class="code">CR001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>Termine<span class="code">SA007</span></div>
            </div>
            <div class="mn-main">
              <div class="mn-crumb">Übersicht / <b>Exec Dashboard</b></div>
              <div class="mn-tiles">
                <div class="mn-tile"><div class="tk">BESTAND</div><div class="tn">47</div><div class="ts">Stück live</div></div>
                <div class="mn-tile"><div class="tk">VERKAUFT · MTD</div><div class="tn">23</div><div class="ts">+4 vs Ziel</div></div>
                <div class="mn-tile"><div class="tk">Ø TAGE</div><div class="tn">18</div><div class="ts">−6 mit KI</div></div>
                <div class="mn-tile"><div class="tk">LEADS</div><div class="tn">61</div><div class="ts">14 offen</div></div>
                <div class="mn-tile"><div class="tk">BRUTTO · MTD</div><div class="tn" style="font-size:14px">€41k</div><div class="ts">Differenzbest.</div></div>
                <div class="mn-tile"><div class="tk">VERÖFF.</div><div class="tn">188</div><div class="ts">4 Kanäle</div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="snap-cap">Exec Dashboard — die Live-Hülle, samt Objektcodes</div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">Kein Chatbot in der Ecke</div>
      <h2>Ein <span style="color:var(--live)">Ask AI</span>-Panel auf jedem Datensatz.</h2>
      <p>Kontextbewusst, nie ein leeres Feld. Die KI weiß bereits, welches Fahrzeug, welcher Lead, welcher Bericht — die Aktion ist ein Tipp, und die Daten bleiben eine einzige Quelle der Wahrheit.</p>
    </div>
    <div class="split rev">
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">Konsole / Bestand · Anzeigenmanager · MP001</span></div>
          <div class="mock-grid">
            <div class="mg-toolbar">
              <span class="search">⌕ Bestand filtern…</span>
              <span class="b">▤ Spalten</span>
              <span class="b ai">✦ Ask AI</span>
            </div>
            <table class="mg-table">
              <thead><tr><th>Objekt</th><th>Fahrzeug</th><th>Kennz.</th><th>Preis</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td class="pk">VH-1048</td><td>VW Crafter L3H2</td><td>GX-482-K</td><td>€ 24.950</td><td><span class="badge live">live · 3K</span></td></tr>
                <tr><td class="pk">VH-1047</td><td>Mercedes Sprinter</td><td>PJ-119-T</td><td>€ 31.500</td><td><span class="badge live">live · 3K</span></td></tr>
                <tr><td class="pk">VH-1046</td><td>Ford Transit Custom</td><td>RN-770-B</td><td>€ 18.200</td><td><span class="badge draft">Entwurf · KI</span></td></tr>
                <tr><td class="pk">VH-1045</td><td>Renault Master</td><td>SD-205-L</td><td>€ 16.900</td><td><span class="badge sold">verkauft</span></td></tr>
                <tr><td class="pk">VH-1044</td><td>Fiat Ducato Maxi</td><td>TK-431-M</td><td>€ 21.750</td><td><span class="badge live">live · 4K</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="snap-cap">Anzeigenmanager — SE16-artiges Grid, KI in der Toolbar</div>
      </div>
      <div class="copy">
        <div class="eyebrow">Ask AI · im Kontext</div>
        <h3>Jeder Button kann KI-gestützt sein.</h3>
        <p>Wähle ein Fahrzeug und das Panel kennt es schon. Kein Kopieren in einen separaten Tab, kein erneutes Beschreiben für einen generischen Assistenten.</p>
        <div class="snap" style="margin-top:16px">
          <div class="mock-ai">
            <div class="mai-head"><span class="spark">✦</span><span class="t">DES KI</span><span class="ctx">Kontext · VH-1048</span></div>
            <div class="mai-body">
              <div class="mai-ctxcard"><div class="l">Ausgewähltes Fahrzeug</div><div class="v">VW Crafter L3H2 · <span class="plate">GX-482-K</span></div></div>
              <div class="mai-actions">
                <div class="mai-act"><span class="i">✎</span>Anzeige schreiben, in 5 Sprachen übersetzen<span class="go">run</span></div>
                <div class="mai-act"><span class="i">◈</span>Angebotspreis aus Live-Vergleichen vorschlagen<span class="go">run</span></div>
                <div class="mai-act"><span class="i">⇄</span>Ähnliche Fahrzeuge im Bestand finden<span class="go">run</span></div>
                <div class="mai-act"><span class="i">↑</span>Auf den Kanälen veröffentlichen, die es am schnellsten verkaufen<span class="go">run</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">Der Stack, für den du zahlst</div>
      <h2>Du brauchst keine weitere Software. Du brauchst, dass sie aufhört, zwölf Dinge zu sein.</h2>
      <p>Jedes Angebot von Hand kopiert, jede Anzeige pro Kanal neu hochgeladen, jede Zahl neu in die Buchhaltung getippt. Die Last sind nicht die Abos — es ist das Umschalten.</p>
    </div>
    <div class="frag">
      <div>
        <div class="col-h">Heute · der Desktop eines Händlers</div>
        <div class="tool-cloud">
          <span>Excel-Bestand</span><span>WhatsApp</span><span>Outlook</span><span>Mobile.de</span><span>AutoScout24</span><span>Marktplaats</span><span>Buchhaltung</span><span>Rechnungstool</span><span>CRM</span><span>Google Drive</span><span>Foto-Editor</span><span>ChatGPT-Tab</span>
        </div>
      </div>
      <div class="frag-arrow"><div class="l">wird zu</div><div class="a">→</div></div>
      <div>
        <div class="col-h">Auf DES BOP V2</div>
        <div class="one-panel">
          <div class="big"><span class="mono">EINE PLATTFORM</span>Alles, verbunden.</div>
          <ul><li>Ein Datenmodell — kein Abtippen</li><li>Ein Klick — jeder Kanal</li><li>Ein Assistent — in jedem Screen</li><li>Ein Rechnungsfluss — MwSt geregelt</li></ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="pad" id="modules">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">Die Plattform · gebaut und ausgerollt</div>
      <h2>Acht Domänen. Eine Konsole. Nichts aufgesetzt.</h2>
      <p>Das ist die Live-Navigation, keine Roadmap. Jede Domäne teilt Datensätze, Rechte und die KI-Schicht.</p>
    </div>
    <div class="mods">
      <div class="mod"><div class="code">AN·BO</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg><h3>Übersicht</h3><div class="items">Exec Dashboard · Conversion-Funnel · Sitzungs-Intelligenz · Anzeigen-Performance</div><div class="ai-tag">KI-Insights</div></div>
      <div class="mod"><div class="code">AS·IN</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg><h3>Bestand</h3><div class="items">Katalog · Marken · Kategorien · Lieferanten · Modellkatalog · Taxonomie</div><div class="ai-tag">KI Spec-Import</div></div>
      <div class="mod"><div class="code">MP·PB·AU</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v4H4z"/><path d="M6 8v12h12V8"/><path d="M9 12h6"/></svg><h3>Marktplatz</h3><div class="items">Anzeigenmanager · Kanal-Publisher · Publikationswarteschlange · Auktionsmanager</div><div class="ai-tag">KI-Kanalrouting</div></div>
      <div class="mod"><div class="code">CR·SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M17 11l2 2 4-4"/></svg><h3>Sales & CRM</h3><div class="items">Leads · Pipeline · Termine · Bewertungen · Vermietung · Käufer-Inbox</div><div class="ai-tag">KI-Nachfassen</div></div>
      <div class="mod"><div class="code">SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg><h3>Verkaufsfluss</h3><div class="items">Angebote · Angebotsbuilder · Aufträge · Zahlungen · Verträge</div><div class="ai-tag">KI-Angebote</div></div>
      <div class="mod"><div class="code">FI</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg><h3>Finanzen</h3><div class="items">MwSt-Schnellrechner · Beleg-Scanner · Lieferanten-AP · Zahlungstracking · Gewinn & Verlust</div><div class="ai-tag">MwSt-Assistent KI</div></div>
      <div class="mod"><div class="code">AI·MK</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg><h3>Intelligence</h3><div class="items">Command Center · Marktbewertung · Wettbewerbsaktivität · Prompt-Manager · Aktions-Audit</div><div class="ai-tag">KI-Kern</div></div>
      <div class="mod"><div class="code">MD·OP</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l9 4-9 4-9-4 9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg><h3>Data & Tools</h3><div class="items">Geschäftspartner · Fahrzeugtaxonomie · QR · Flyer-Builder · Wasserzeichen · Foto-Optimierung</div><div class="ai-tag">KI-Fototools</div></div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="split">
      <div class="copy">
        <div class="eyebrow">Einmal erstellen · überall veröffentlichen</div>
        <h3>Vom Kennzeichen-Scan zu fünf Sprachen, in einem Durchgang.</h3>
        <p>Scanne das Kennzeichen und RDW füllt die Specs. KI säubert die Fotos, schreibt den Text, bepreist gegen Live-Vergleiche und pusht auf jeden Kanal — der Händler bestätigt, tippt nicht.</p>
        <ul>
          <li>RDW-Autofill bei Kennzeichenabfrage</li>
          <li>Fotos optimiert und mit Wasserzeichen</li>
          <li>Text + SEO in NL · EN · DE · FR · TR</li>
          <li>Ein Klick über vier Kanäle</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">Anzeige · VH-1048 · bereit zur Veröffentlichung</span></div>
          <div class="mock-list">
            <div class="ml-top">
              <div class="ml-photo"><span class="car"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20h40M6 20l3-9h20l6 6h5v3M11 20a3 3 0 106 0M29 20a3 3 0 106 0"/></svg></span></div>
              <div class="ml-info">
                <div class="tt">VW Crafter L3H2 2.0 TDI</div>
                <div class="meta">2021 · 84.500 km · Diesel · GX-482-K</div>
                <div class="price">€ 24.950 <small>✦ KI-bepreist · 11T bis Verkauf</small></div>
              </div>
            </div>
            <div class="ml-langs">
              <span class="ml-lang on">NL</span><span class="ml-lang on">EN</span><span class="ml-lang on">DE</span><span class="ml-lang on">FR</span><span class="ml-lang on">TR</span><span class="ml-lang">✦ generiert</span>
            </div>
            <div class="ml-chan">
              <span>Marktplaats</span><span>Mobile.de</span><span>AutoScout24</span><span>Website</span>
            </div>
          </div>
        </div>
        <div class="snap-cap">Anzeigendetail — KI-geschrieben, KI-bepreist, ein Klick auf vier Kanäle</div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">Vorher / nachher</div><h2>Was sich an einem Dienstagmorgen wirklich ändert.</h2></div>
    <div class="cmp">
      <div class="h old">Wie es heute läuft</div><div class="h new">Auf DES BOP V2</div>
      <div class="r old">Zwölf Abos, zwölf Logins</div><div class="r new">Eine Plattform, ein Login</div>
      <div class="r old">Anzeige tippen, dann pro Seite neu tippen</div><div class="r new">KI schreibt sie einmal, sechs Sprachen</div>
      <div class="r old">Fotos von Hand auf jeden Marktplatz laden</div><div class="r new">Ein Klick, jeder Kanal</div>
      <div class="r old">Bestand in einer Tabelle, der niemand traut</div><div class="r new">Live-Bestand, eine Quelle der Wahrheit</div>
      <div class="r old">Leads aus dem Gedächtnis verfolgen</div><div class="r new">KI entwirft das Nachfassen pünktlich</div>
      <div class="r old">Differenzbesteuerung von Hand rechnen</div><div class="r new">MwSt-Assistent erstellt die Differenz-Rechnung</div>
    </div>
  </div>
</section>

<section class="pad" id="score">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">Ehrliche Bewertung</div><h2>Wo die Plattform heute steht.</h2><p>Die Abdeckung ist Enterprise-Niveau. Die Lücke war nie das Produkt — es war die Geschichte beim Einstieg.</p></div>
    <div class="score">
      <div class="score-list" id="scorelist">
        <div class="score-row"><span class="k">Funktionsabdeckung</span><span class="bar"><i data-w="97"></i></span><span class="v">9.7</span></div>
        <div class="score-row"><span class="k">Händler-Passung</span><span class="bar"><i data-w="98"></i></span><span class="v">9.8</span></div>
        <div class="score-row"><span class="k">ERP-Fähigkeiten</span><span class="bar"><i data-w="95"></i></span><span class="v">9.5</span></div>
        <div class="score-row"><span class="k">Marktplatz-Integration</span><span class="bar"><i data-w="100"></i></span><span class="v">10</span></div>
        <div class="score-row"><span class="k">KI-Reife</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">UX-Einfachheit</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">Marketing-Klarheit</span><span class="bar"><i data-w="90"></i></span><span class="v">9.0</span></div>
      </div>
      <div class="score-note">
        <h4>Das Schwächste war die Erklärung. Diese Seite löst das.</h4>
        <p>Beginne mit dem Geld und der Live-Konsole, in der Sprache des Handels, und der Wert wird gezeigt, bevor er behauptet wird. Ein Händler denkt nicht mehr "noch ein DMS", sondern "das ersetzt die Hälfte meines Stacks".</p>
      </div>
    </div>
  </div>
</section>

<section class="cta" id="cta">
  <div class="wrap">
    <h2>Führe dein ganzes Autohaus.<br>Angetrieben von KI.</h2>
    <p>Vom Kennzeichen-Scan bis zum Lieferschein — sieh zu, wie es deinen echten Bestand in einer Sitzung bewegt.</p>
    <div class="hero-cta">
      <a href="/de/contact" class="btn btn-primary">Demo buchen →</a>
      <a href="/de/platform/calculator" class="btn btn-ghost">Sparrechner öffnen</a>
    </div>
    <div class="fine">Kein Migrationsmarathon · dein Datenmodell, deine Kanäle, deine Sprache</div>
  </div>
</section>
`

const MARKUPS: Record<string, string> = { en: MARKUP, nl: MARKUP_NL, de: MARKUP_DE }
const RUN_LABELS: Record<string, string[]> = {
  en: ["plate scanned","RDW specs pulled","photos enhanced","listing written · 5 langs","price suggested","published · 3 channels","lead handled","sold · invoiced"],
  nl: ["kenteken gescand","RDW-specs opgehaald","foto's verbeterd","advertentie geschreven · 5 talen","prijs voorgesteld","gepubliceerd · 3 kanalen","lead afgehandeld","verkocht · gefactureerd"],
  de: ["Kennzeichen gescannt","RDW-Specs abgerufen","Fotos optimiert","Anzeige verfasst · 5 Sprachen","Preis vorgeschlagen","veröffentlicht · 3 Kanäle","Lead bearbeitet","verkauft · fakturiert"],
}
const RUNNING_TXT: Record<string, string> = { en: "running · ", nl: "bezig · ", de: "läuft · " }
const CYCLE_TXT: Record<string, (n: number) => string> = {
  en: (n) => "cycle complete · " + n + " steps automated",
  nl: (n) => "cyclus voltooid · " + n + " stappen geautomatiseerd",
  de: (n) => "Zyklus abgeschlossen · " + n + " Schritte automatisiert",
}

export default function PlatformClient({ locale = "en" }: { locale?: string }) {
  const lang = MARKUPS[locale] ? locale : "en"
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const observers: IntersectionObserver[] = []

    /* live console playback */
    const consoleEl = document.getElementById("console")
    if (consoleEl) {
      const steps = Array.from(document.querySelectorAll<HTMLElement>(".bopv2 .step"))
      const prog = Array.from(document.querySelectorAll<HTMLElement>(".bopv2 #prog i"))
      const foot = document.getElementById("footlabel")
      const labels = RUN_LABELS[lang]
      let i = -1
      let started = false
      const reset = () => { steps.forEach(s => s.classList.remove("active","done")); prog.forEach(p => p.classList.remove("on")); i = -1 }
      const tick = () => {
        if (i >= 0) { steps[i].classList.remove("active"); steps[i].classList.add("done") }
        i++
        if (i >= steps.length) {
          if (foot) foot.textContent = CYCLE_TXT[lang](steps.length)
          timers.push(setTimeout(() => { reset(); timers.push(setTimeout(tick, 700)) }, 2600))
          return
        }
        steps[i].classList.add("active")
        if (prog[i]) prog[i].classList.add("on")
        if (foot) foot.textContent = RUNNING_TXT[lang] + labels[i]
        timers.push(setTimeout(tick, i === 0 ? 900 : 1150))
      }
      const io = new IntersectionObserver((e) => {
        e.forEach(en => { if (en.isIntersecting && !started) { started = true; timers.push(setTimeout(tick, 600)) } })
      }, { threshold: .4 })
      io.observe(consoleEl)
      observers.push(io)
    }

    /* score bars */
    const scorelist = document.getElementById("scorelist")
    if (scorelist) {
      const bars = Array.from(document.querySelectorAll<HTMLElement>(".bopv2 #scorelist .bar i"))
      const io2 = new IntersectionObserver((e) => {
        e.forEach(en => { if (en.isIntersecting) { bars.forEach((b, k) => timers.push(setTimeout(() => { b.style.width = (b.dataset.w || "0") + "%" }, k * 90))); io2.disconnect() } })
      }, { threshold: .3 })
      io2.observe(scorelist)
      observers.push(io2)
    }

    return () => { timers.forEach(clearTimeout); observers.forEach(o => o.disconnect()) }
  }, [lang])

  // en template is the fallback for tr/fr — rewrite its /en/ links to the active locale
  const html = lang === "en" && locale !== "en"
    ? MARKUPS.en.split("/en/").join("/" + locale + "/")
    : MARKUPS[lang]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bopv2" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
