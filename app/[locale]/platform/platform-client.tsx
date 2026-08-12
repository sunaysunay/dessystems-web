"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"

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

/* module-grid variant: 3 cols desktop -> 2 tablet -> 1 mobile, text-only cells */
.bopv2 .mods3{grid-template-columns:repeat(3,1fr)}
.bopv2 .mods3 .mod{min-height:auto;padding:24px 22px}
.bopv2 .mod-desc{margin-top:8px;font-size:13.5px;color:var(--fog);line-height:1.6;font-family:var(--body)}
.bopv2 .eyebrow.center{justify-content:center}
@media(max-width:900px){.bopv2 .mods3{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.bopv2 .mods3{grid-template-columns:1fr}}

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

type Tr = { (key: string, values?: Record<string, unknown>): string; raw: (key: string) => string }

function buildMarkup(t: Tr, locale: string): string {
  return `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <div class="tagpill"><span class="d"></span>${t.raw("hero_tag")}</div>
      <h1>${t.raw("hero_title")}</h1>
      <p class="lede">${t.raw("hero_lede")}</p>
      <p class="sub">${t.raw("hero_sub")}</p>
      <div class="hero-cta">
        <a href="/${locale}/contact" class="btn btn-primary">${t.raw("hero_cta")}</a>
        <a href="#numbers" class="btn btn-ghost">${t.raw("hero_cta2")}</a>
      </div>
    </div>
    <div class="console" id="console">
      <div class="console-bar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="title">${t.raw("console_title")}</span>
        <span class="live-badge">${t.raw("console_live")}</span>
      </div>
      <div class="console-body" id="steps">
        <div class="step" data-i="0"><div class="ico">1</div><div><div class="who">${t.raw("step0_who")}</div><div class="txt">${t.raw("step0_txt")}</div></div></div>
        <div class="step" data-i="1"><div class="ico">✦</div><div><div class="who ai">${t.raw("step1_who")}</div><div class="txt">${t.raw("step1_txt")}</div></div></div>
        <div class="step" data-i="2"><div class="ico">✦</div><div><div class="who ai">${t.raw("step2_who")}</div><div class="txt">${t.raw("step2_txt")}</div></div></div>
        <div class="step" data-i="3"><div class="ico">✦</div><div><div class="who ai">${t.raw("step3_who")}</div><div class="txt">${t.raw("step3_txt")}</div></div></div>
        <div class="step" data-i="4"><div class="ico">✦</div><div><div class="who ai">${t.raw("step4_who")}</div><div class="txt">${t.raw("step4_txt")}</div></div></div>
        <div class="step" data-i="5"><div class="ico">↑</div><div><div class="who">${t.raw("step5_who")}</div><div class="txt">${t.raw("step5_txt")}</div></div></div>
        <div class="step" data-i="6"><div class="ico">✦</div><div><div class="who ai">${t.raw("step6_who")}</div><div class="txt">${t.raw("step6_txt")}</div></div></div>
        <div class="step" data-i="7"><div class="ico">✓</div><div><div class="who">${t.raw("step7_who")}</div><div class="txt">${t.raw("step7_txt")}</div></div></div>
      </div>
      <div class="console-foot"><span id="footlabel">${t.raw("idle_text")}</span><span class="prog" id="prog"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">${t.raw("sec1_eyebrow")}</div>
      <h2>${t.raw("sec1_h2")}</h2>
      <p>${t.raw("sec1_p")}</p>
    </div>
    <div class="split">
      <div class="copy">
        <div class="eyebrow">${t.raw("sec1_eyebrow2")}</div>
        <h3>${t.raw("sec1_h3")}</h3>
        <p>${t.raw("sec1_p2")}</p>
        <ul>
          <li>${t.raw("sec1_li1")}</li>
          <li>${t.raw("sec1_li2")}</li>
          <li>${t.raw("sec1_li3")}</li>
          <li>${t.raw("sec1_li4")}</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">bop.dessystems.io / console</span></div>
          <div class="mock-nav">
            <div class="mn-side">
              <div class="mn-group">${t.raw("mock1_g1")}</div>
              <div class="mn-item sel"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>${t.raw("mock1_i1")}<span class="code">AN001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${t.raw("mock1_i2")}<span class="code">AN002</span></div>
              <div class="mn-group">${t.raw("mock1_g2")}</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>${t.raw("mock1_i3")}<span class="code">AS001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 12h16M4 17h10"/></svg>${t.raw("mock1_i4")}<span class="code">IN001</span></div>
              <div class="mn-group">${t.raw("mock1_g3")}</div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 015-5h2"/></svg>${t.raw("mock1_i5")}<span class="code">CR001</span></div>
              <div class="mn-item"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>${t.raw("mock1_i6")}<span class="code">SA007</span></div>
            </div>
            <div class="mn-main">
              <div class="mn-crumb">${t.raw("mock1_crumb")}</div>
              <div class="mn-tiles">
                <div class="mn-tile"><div class="tk">${t.raw("tile1_k")}</div><div class="tn">47</div><div class="ts">${t.raw("tile1_s")}</div></div>
                <div class="mn-tile"><div class="tk">${t.raw("tile2_k")}</div><div class="tn">23</div><div class="ts">${t.raw("tile2_s")}</div></div>
                <div class="mn-tile"><div class="tk">${t.raw("tile3_k")}</div><div class="tn">18</div><div class="ts">${t.raw("tile3_s")}</div></div>
                <div class="mn-tile"><div class="tk">${t.raw("tile4_k")}</div><div class="tn">61</div><div class="ts">${t.raw("tile4_s")}</div></div>
                <div class="mn-tile"><div class="tk">${t.raw("tile5_k")}</div><div class="tn" style="font-size:14px">€41k</div><div class="ts">${t.raw("tile5_s")}</div></div>
                <div class="mn-tile"><div class="tk">${t.raw("tile6_k")}</div><div class="tn">188</div><div class="ts">${t.raw("tile6_s")}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="snap-cap">${t.raw("snap1_cap")}</div>
      </div>
    </div>
  </div>
</section>

<section class="pad" style="padding-top:56px;padding-bottom:56px">
  <div class="wrap">
    <div class="eyebrow center" style="margin-bottom:26px">${t.raw("modrow_eyebrow")}</div>
    <div class="mods mods3">
      <div class="mod"><h3>${t.raw("mod1_h")}</h3><p class="mod-desc">${t.raw("mod1_p")}</p></div>
      <div class="mod"><h3>${t.raw("mod2_h")}</h3><p class="mod-desc">${t.raw("mod2_p")}</p></div>
      <div class="mod"><h3>${t.raw("mod3_h")}</h3><p class="mod-desc">${t.raw("mod3_p")}</p></div>
      <div class="mod"><h3>${t.raw("mod4_h")}</h3><p class="mod-desc">${t.raw("mod4_p")}</p></div>
      <div class="mod"><h3>${t.raw("mod5_h")}</h3><p class="mod-desc">${t.raw("mod5_p")}</p></div>
      <div class="mod"><h3>${t.raw("mod6_h")}</h3><p class="mod-desc">${t.raw("mod6_p")}</p></div>
    </div>
  </div>
</section>

<section class="econ" id="numbers">
  <div class="wrap">
    <div class="econ-head">
      <div class="t">${t.raw("econ_head")}</div>
      <div class="note">${t.raw("econ_note")}</div>
    </div>
    <div class="stat-row">
      <div class="stat hl">
        <div class="k">${t.raw("stat1_k")}</div>
        <div class="n"><span class="cur">€</span>46.187</div>
        <div class="sub">${t.raw("stat1_sub")}</div>
      </div>
      <div class="stat green">
        <div class="k">${t.raw("stat2_k")}</div>
        <div class="n">+34%</div>
        <div class="sub">${t.raw("stat2_sub")}</div>
      </div>
      <div class="stat">
        <div class="k">${t.raw("stat3_k")}</div>
        <div class="n">91</div>
        <div class="sub">${t.raw("stat3_sub")}</div>
      </div>
      <div class="stat">
        <div class="k">${t.raw("stat4_k")}</div>
        <div class="n"><span class="cur">€</span>12</div>
        <div class="sub">${t.raw("stat4_sub")}</div>
      </div>
    </div>
    <div style="margin-top:20px"><a href="/${locale}/platform/calculator" class="btn btn-primary">${t.raw("calc_btn")}</a></div>
  </div>
</section>

<div class="strip">
  <div class="wrap strip-inner">
    <span class="lbl">${t.raw("strip_lbl")}</span>
    <span class="chip">${t.raw("chip1")}</span><span class="chip">${t.raw("chip2")}</span><span class="chip">${t.raw("chip3")}</span>
    <span class="chip">${t.raw("chip4")}</span><span class="chip">${t.raw("chip5")}</span><span class="chip">${t.raw("chip6")}</span><span class="chip">${t.raw("chip7")}</span>
  </div>
</div>

<section class="pad">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">${t.raw("sec2_eyebrow")}</div>
      <h2>${t.raw("sec2_h2")}</h2>
      <p>${t.raw("sec2_p")}</p>
    </div>
    <div class="split rev">
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">${t.raw("snap2_path")}</span></div>
          <div class="mock-grid">
            <div class="mg-toolbar">
              <span class="search">${t.raw("grid_search")}</span>
              <span class="b">${t.raw("grid_cols")}</span>
              <span class="b ai">${t.raw("grid_ai")}</span>
            </div>
            <table class="mg-table">
              <thead><tr><th>${t.raw("th1")}</th><th>${t.raw("th2")}</th><th>${t.raw("th3")}</th><th>${t.raw("th4")}</th><th>${t.raw("th5")}</th></tr></thead>
              <tbody>
                <tr><td class="pk">VH-1048</td><td>VW Crafter L3H2</td><td>GX-482-K</td><td>€ 24.950</td><td><span class="badge live">${t.raw("badge_live3")}</span></td></tr>
                <tr><td class="pk">VH-1047</td><td>Mercedes Sprinter</td><td>PJ-119-T</td><td>€ 31.500</td><td><span class="badge live">${t.raw("badge_live3")}</span></td></tr>
                <tr><td class="pk">VH-1046</td><td>Ford Transit Custom</td><td>RN-770-B</td><td>€ 18.200</td><td><span class="badge draft">${t.raw("badge_draft")}</span></td></tr>
                <tr><td class="pk">VH-1045</td><td>Renault Master</td><td>SD-205-L</td><td>€ 16.900</td><td><span class="badge sold">${t.raw("badge_sold")}</span></td></tr>
                <tr><td class="pk">VH-1044</td><td>Fiat Ducato Maxi</td><td>TK-431-M</td><td>€ 21.750</td><td><span class="badge live">${t.raw("badge_live4")}</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="snap-cap">${t.raw("snap2_cap")}</div>
      </div>
      <div class="copy">
        <div class="eyebrow">${t.raw("sec2_eyebrow2")}</div>
        <h3>${t.raw("sec2_h3")}</h3>
        <p>${t.raw("sec2_p2")}</p>
        <div class="snap" style="margin-top:16px">
          <div class="mock-ai">
            <div class="mai-head"><span class="spark">✦</span><span class="t">DES AI</span><span class="ctx">${t.raw("mai_ctx")}</span></div>
            <div class="mai-body">
              <div class="mai-ctxcard"><div class="l">${t.raw("mai_sel")}</div><div class="v">VW Crafter L3H2 · <span class="plate">GX-482-K</span></div></div>
              <div class="mai-actions">
                <div class="mai-act"><span class="i">✎</span>${t.raw("mai_a1")}<span class="go">${t.raw("mai_run")}</span></div>
                <div class="mai-act"><span class="i">◈</span>${t.raw("mai_a2")}<span class="go">${t.raw("mai_run")}</span></div>
                <div class="mai-act"><span class="i">⇄</span>${t.raw("mai_a3")}<span class="go">${t.raw("mai_run")}</span></div>
                <div class="mai-act"><span class="i">↑</span>${t.raw("mai_a4")}<span class="go">${t.raw("mai_run")}</span></div>
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
      <div class="eyebrow">${t.raw("sec3_eyebrow")}</div>
      <h2>${t.raw("sec3_h2")}</h2>
      <p>${t.raw("sec3_p")}</p>
    </div>
    <div class="frag">
      <div>
        <div class="col-h">${t.raw("sec3_col1")}</div>
        <div class="tool-cloud">
          <span>${t.raw("cloud1")}</span><span>${t.raw("cloud2")}</span><span>${t.raw("cloud3")}</span><span>${t.raw("cloud4")}</span><span>${t.raw("cloud5")}</span><span>${t.raw("cloud6")}</span><span>${t.raw("cloud7")}</span><span>${t.raw("cloud8")}</span><span>${t.raw("cloud9")}</span><span>${t.raw("cloud10")}</span><span>${t.raw("cloud11")}</span><span>${t.raw("cloud12")}</span>
        </div>
      </div>
      <div class="frag-arrow"><div class="l">${t.raw("sec3_arrow")}</div><div class="a">→</div></div>
      <div>
        <div class="col-h">${t.raw("sec3_col2")}</div>
        <div class="one-panel">
          <div class="big">${t.raw("sec3_bigh")}</div>
          <ul><li>${t.raw("sec3_bli1")}</li><li>${t.raw("sec3_bli2")}</li><li>${t.raw("sec3_bli3")}</li><li>${t.raw("sec3_bli4")}</li></ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="pad" id="modules">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow">${t.raw("sec4_eyebrow")}</div>
      <h2>${t.raw("sec4_h2")}</h2>
      <p>${t.raw("sec4_p")}</p>
    </div>
    <div class="mods">
      <div class="mod"><div class="code">AN·BO</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg><h3>${t.raw("dom1_h")}</h3><div class="items">${t.raw("dom1_items")}</div><div class="ai-tag">${t.raw("dom1_ai")}</div></div>
      <div class="mod"><div class="code">AS·IN</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg><h3>${t.raw("dom2_h")}</h3><div class="items">${t.raw("dom2_items")}</div><div class="ai-tag">${t.raw("dom2_ai")}</div></div>
      <div class="mod"><div class="code">MP·PB·AU</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v4H4z"/><path d="M6 8v12h12V8"/><path d="M9 12h6"/></svg><h3>${t.raw("dom3_h")}</h3><div class="items">${t.raw("dom3_items")}</div><div class="ai-tag">${t.raw("dom3_ai")}</div></div>
      <div class="mod"><div class="code">CR·SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M17 11l2 2 4-4"/></svg><h3>${t.raw("dom4_h")}</h3><div class="items">${t.raw("dom4_items")}</div><div class="ai-tag">${t.raw("dom4_ai")}</div></div>
      <div class="mod"><div class="code">SA</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg><h3>${t.raw("dom5_h")}</h3><div class="items">${t.raw("dom5_items")}</div><div class="ai-tag">${t.raw("dom5_ai")}</div></div>
      <div class="mod"><div class="code">FI</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg><h3>${t.raw("dom6_h")}</h3><div class="items">${t.raw("dom6_items")}</div><div class="ai-tag">${t.raw("dom6_ai")}</div></div>
      <div class="mod"><div class="code">AI·MK</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg><h3>${t.raw("dom7_h")}</h3><div class="items">${t.raw("dom7_items")}</div><div class="ai-tag">${t.raw("dom7_ai")}</div></div>
      <div class="mod"><div class="code">MD·OP</div><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l9 4-9 4-9-4 9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg><h3>${t.raw("dom8_h")}</h3><div class="items">${t.raw("dom8_items")}</div><div class="ai-tag">${t.raw("dom8_ai")}</div></div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="split">
      <div class="copy">
        <div class="eyebrow">${t.raw("sec5_eyebrow")}</div>
        <h3>${t.raw("sec5_h3")}</h3>
        <p>${t.raw("sec5_p")}</p>
        <ul>
          <li>${t.raw("sec5_li1")}</li>
          <li>${t.raw("sec5_li2")}</li>
          <li>${t.raw("sec5_li3")}</li>
          <li>${t.raw("sec5_li4")}</li>
        </ul>
      </div>
      <div class="snapwrap">
        <div class="snap">
          <div class="snap-bar"><span class="d"></span><span class="d"></span><span class="d"></span><span class="p">${t.raw("snap5_path")}</span></div>
          <div class="mock-list">
            <div class="ml-top">
              <div class="ml-photo"><span class="car"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 20h40M6 20l3-9h20l6 6h5v3M11 20a3 3 0 106 0M29 20a3 3 0 106 0"/></svg></span></div>
              <div class="ml-info">
                <div class="tt">VW Crafter L3H2 2.0 TDI</div>
                <div class="meta">${t.raw("ml_meta")}</div>
                <div class="price">€ 24.950 <small>${t.raw("ml_priced")}</small></div>
              </div>
            </div>
            <div class="ml-langs">
              <span class="ml-lang on">NL</span><span class="ml-lang on">EN</span><span class="ml-lang on">DE</span><span class="ml-lang on">FR</span><span class="ml-lang on">TR</span><span class="ml-lang">${t.raw("ml_gen")}</span>
            </div>
            <div class="ml-chan">
              <span>Marktplaats</span><span>Mobile.de</span><span>AutoScout24</span><span>Website</span>
            </div>
          </div>
        </div>
        <div class="snap-cap">${t.raw("snap5_cap")}</div>
      </div>
    </div>
  </div>
</section>

<section class="pad">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">${t.raw("sec6_eyebrow")}</div><h2>${t.raw("sec6_h2")}</h2></div>
    <div class="cmp">
      <div class="h old">${t.raw("sec6_old")}</div><div class="h new">${t.raw("sec6_new")}</div>
      <div class="r old">${t.raw("r1_old")}</div><div class="r new">${t.raw("r1_new")}</div>
      <div class="r old">${t.raw("r2_old")}</div><div class="r new">${t.raw("r2_new")}</div>
      <div class="r old">${t.raw("r3_old")}</div><div class="r new">${t.raw("r3_new")}</div>
      <div class="r old">${t.raw("r4_old")}</div><div class="r new">${t.raw("r4_new")}</div>
      <div class="r old">${t.raw("r5_old")}</div><div class="r new">${t.raw("r5_new")}</div>
      <div class="r old">${t.raw("r6_old")}</div><div class="r new">${t.raw("r6_new")}</div>
    </div>
  </div>
</section>

<section class="pad" id="score">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow">${t.raw("sec7_eyebrow")}</div><h2>${t.raw("sec7_h2")}</h2><p>${t.raw("sec7_p")}</p></div>
    <div class="score">
      <div class="score-list" id="scorelist">
        <div class="score-row"><span class="k">${t.raw("score1")}</span><span class="bar"><i data-w="97"></i></span><span class="v">9.7</span></div>
        <div class="score-row"><span class="k">${t.raw("score2")}</span><span class="bar"><i data-w="98"></i></span><span class="v">9.8</span></div>
        <div class="score-row"><span class="k">${t.raw("score3")}</span><span class="bar"><i data-w="95"></i></span><span class="v">9.5</span></div>
        <div class="score-row"><span class="k">${t.raw("score4")}</span><span class="bar"><i data-w="100"></i></span><span class="v">10</span></div>
        <div class="score-row"><span class="k">${t.raw("score5")}</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">${t.raw("score6")}</span><span class="bar"><i data-w="85"></i></span><span class="v">8.5</span></div>
        <div class="score-row"><span class="k">${t.raw("score7")}</span><span class="bar"><i data-w="90"></i></span><span class="v">9.0</span></div>
      </div>
      <div class="score-note">
        <h4>${t.raw("score_note_h")}</h4>
        <p>${t.raw("score_note_p")}</p>
      </div>
    </div>
  </div>
</section>

<section class="cta" id="cta">
  <div class="wrap">
    <h2>${t.raw("cta_h2")}</h2>
    <p>${t.raw("cta_p")}</p>
    <div class="hero-cta">
      <a href="/${locale}/contact" class="btn btn-primary">${t.raw("cta_btn1")}</a>
      <a href="/${locale}/platform/calculator" class="btn btn-ghost">${t.raw("cta_btn2")}</a>
    </div>
    <div class="fine">${t.raw("cta_fine")}</div>
  </div>
</section>
`
}

export default function PlatformClient({ locale = "en" }: { locale?: string }) {
  const t = useTranslations("bop_platform") as unknown as Tr

  const runLabels = [
    t("run1"), t("run2"), t("run3"), t("run4"),
    t("run5"), t("run6"), t("run7"), t("run8"),
  ]
  const runningTxt = t("run_running")
  const cycleTxt = (n: number) => t("run_cycle", { n })

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const observers: IntersectionObserver[] = []

    /* live console playback */
    const consoleEl = document.getElementById("console")
    if (consoleEl) {
      const steps = Array.from(document.querySelectorAll<HTMLElement>(".bopv2 .step"))
      const prog = Array.from(document.querySelectorAll<HTMLElement>(".bopv2 #prog i"))
      const foot = document.getElementById("footlabel")
      let i = -1
      let started = false
      const reset = () => { steps.forEach(s => s.classList.remove("active","done")); prog.forEach(p => p.classList.remove("on")); i = -1 }
      const tick = () => {
        if (i >= 0) { steps[i].classList.remove("active"); steps[i].classList.add("done") }
        i++
        if (i >= steps.length) {
          if (foot) foot.textContent = cycleTxt(steps.length)
          timers.push(setTimeout(() => { reset(); timers.push(setTimeout(tick, 700)) }, 2600))
          return
        }
        steps[i].classList.add("active")
        if (prog[i]) prog[i].classList.add("on")
        if (foot) foot.textContent = runningTxt + runLabels[i]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bopv2" dangerouslySetInnerHTML={{ __html: buildMarkup(t, locale) }} />
    </>
  )
}
