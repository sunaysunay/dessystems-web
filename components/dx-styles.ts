export const dxCss = `
.dx{--navy:#0b1f3a;--navy-2:#13294b;--ink:#1a2233;--slate:#5a6678;--line:#e4e8ef;--bg:#fff;--bg-soft:#f5f7fa;--accent:#1d6cf0;--accent-2:#0f9d8c;--radius:14px;--shadow:0 1px 2px rgba(11,31,58,.06),0 8px 24px rgba(11,31,58,.06);--maxw:1180px;color:var(--ink);background:var(--bg)}
.dx a{color:inherit;text-decoration:none}
.dx .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
.dx .eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.dx h2{font-size:clamp(26px,3.4vw,38px);line-height:1.15;font-weight:800;letter-spacing:-.02em;color:var(--navy)}
.dx h3{font-size:18px;font-weight:700;color:var(--navy);letter-spacing:-.01em}
.dx p.lead{color:var(--slate);font-size:17px;max-width:620px}
.dx .section{padding:88px 0}
.dx .section.soft{background:var(--bg-soft)}
.dx .center{text-align:center}
.dx .center p.lead{margin:14px auto 0}
.dx .btn{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:15px;padding:13px 22px;border-radius:10px;transition:.18s ease;border:1px solid transparent;cursor:pointer}
.dx .btn svg{width:16px;height:16px}
.dx .btn-primary{background:var(--accent);color:#fff;box-shadow:0 6px 16px rgba(29,108,240,.28)}
.dx .btn-primary:hover{background:#1559cc;transform:translateY(-1px)}
.dx .btn-ghost{background:transparent;color:var(--navy);border-color:var(--line)}
.dx .btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
.dx .btn-outline{background:#fff;color:var(--navy);border-color:var(--line)}
.dx .btn-outline:hover{border-color:var(--accent);color:var(--accent)}
.dx .logos{padding:34px 0;border-bottom:1px solid var(--line)}
.dx .logos p{text-align:center;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--slate);margin-bottom:22px}
.dx .logo-row{display:flex;flex-wrap:wrap;gap:42px;justify-content:center;align-items:center;opacity:.62}
.dx .logo-row b{font-size:20px;font-weight:800;color:var(--navy);letter-spacing:-.02em}
.dx .grid{display:grid;gap:22px}
.dx .grid-3{grid-template-columns:repeat(3,1fr)}
.dx .grid-4{grid-template-columns:repeat(4,1fr)}
.dx .grid-5{grid-template-columns:repeat(5,1fr)}
.dx .grid-2{grid-template-columns:1fr 1fr}
@media(max-width:1100px){.dx .grid-5{grid-template-columns:repeat(3,1fr)}}
@media(max-width:920px){.dx .grid-3,.dx .grid-4,.dx .grid-5{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.dx .grid-3,.dx .grid-4,.dx .grid-5,.dx .grid-2{grid-template-columns:1fr}}
.dx .card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:26px;box-shadow:var(--shadow);transition:.2s}
.dx .card:hover{transform:translateY(-3px);border-color:#cdd8ea;box-shadow:0 12px 30px rgba(11,31,58,.10)}
.dx .ic{width:46px;height:46px;border-radius:11px;display:grid;place-items:center;margin-bottom:16px;background:linear-gradient(135deg,rgba(29,108,240,.12),rgba(15,157,140,.12))}
.dx .ic svg{width:23px;height:23px;color:var(--accent)}
.dx .card p{color:var(--slate);font-size:14.5px;margin-top:8px}
.dx .card .more{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-size:14px;font-weight:600;color:var(--accent)}
.dx .card .more svg{width:15px;height:15px}
.dx .head-row{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:40px;flex-wrap:wrap}
.dx .head-row p.lead{margin-top:12px}
.dx .split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
@media(max-width:860px){.dx .split{grid-template-columns:1fr;gap:36px}}
.dx .checks{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px 22px;margin:26px 0 30px;padding:0}
.dx .checks li{display:flex;align-items:center;gap:10px;font-weight:500;font-size:15px;color:var(--ink)}
.dx .checks svg{width:20px;height:20px;flex:none;color:var(--accent-2)}
.dx .modules{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}
.dx .chip{background:#fff;border:1px solid var(--line);color:var(--navy);font-weight:600;font-size:13px;padding:8px 14px;border-radius:8px}
.dx .panelcard{background:var(--navy);border-radius:18px;padding:34px;color:#fff;box-shadow:var(--shadow)}
.dx .panelcard h3{color:#fff;font-size:20px;margin-bottom:10px}
.dx .panelcard p{color:#bccadf;font-size:15px}
.dx .band{background:var(--navy);color:#fff}
.dx .band .grid-4{gap:0}
.dx .band .s{padding:46px 26px;text-align:center;border-left:1px solid rgba(255,255,255,.10)}
.dx .band .s:first-child{border-left:none}
.dx .band .s b{display:block;font-size:40px;font-weight:800;letter-spacing:-.02em}
.dx .band .s span{color:#9fb0cc;font-size:14px}
@media(max-width:600px){.dx .band .s{border-left:none;border-top:1px solid rgba(255,255,255,.1)}.dx .band .s:first-child{border-top:none}}
.dx .quote{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:30px;box-shadow:var(--shadow)}
.dx .quote .stars{color:#f5a623;letter-spacing:3px;font-size:15px;margin-bottom:14px}
.dx .quote p{font-size:16px;color:var(--ink);font-weight:500}
.dx .quote .by{display:flex;align-items:center;gap:12px;margin-top:20px}
.dx .avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--navy));color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px}
.dx .by b{font-size:14px;color:var(--navy);display:block}
.dx .by span{font-size:13px;color:var(--slate)}
.dx .cta{background:linear-gradient(135deg,var(--navy),var(--navy-2));color:#fff;border-radius:20px;padding:56px;text-align:center}
.dx .cta h2{color:#fff}
.dx .cta p{color:#bccadf;margin:14px auto 28px;max-width:520px}
.dx .cta .row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.dx .cta .btn-ghost{color:#fff;border-color:rgba(255,255,255,.28)}
.dx .cta .btn-ghost:hover{background:rgba(255,255,255,.08)}
.dx .flier{background:var(--navy);border-top:1px solid rgba(255,255,255,.08);overflow:hidden}
.dx .flier .track{display:flex;width:max-content;white-space:nowrap;padding:6px 0;animation:dxmarq 60s linear infinite}
.dx .flier:hover .track{animation-play-state:paused}
.dx .flier .item{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9fb0cc;padding:0 38px;position:relative;flex:none}
.dx .flier .item:before{content:"";position:absolute;left:-3px;top:50%;transform:translateY(-50%);width:4px;height:4px;border-radius:50%;background:var(--accent-2)}
@keyframes dxmarq{to{transform:translateX(-50%)}}

/* ── DARK MODE overrides for .dx content ── */
.dark .dx{--ink:#cfd8e8;--slate:#8a9bbf;--line:rgba(255,255,255,0.10);--bg:#0a0f1a;--bg-soft:#0e1626;background:var(--bg);color:var(--ink)}
.dark .dx h2,.dark .dx h3{color:#eef3fc}
.dark .dx .card{background:#0e1626;border-color:rgba(255,255,255,0.08);box-shadow:none}
.dark .dx .card:hover{border-color:rgba(255,255,255,0.18);box-shadow:0 12px 30px rgba(0,0,0,.35)}
.dark .dx .card p{color:#9fb0cc}
.dark .dx .chip{background:#0e1626;border-color:rgba(255,255,255,0.12);color:#cdd8ea}
.dark .dx .checks li{color:#cfd8e8}
.dark .dx .logos{border-color:rgba(255,255,255,0.08)}
.dark .dx .logo-row b{color:#eef3fc}
.dark .dx .btn-ghost,.dark .dx .btn-outline{color:#eef3fc;border-color:rgba(255,255,255,0.18);background:transparent}
.dark .dx .btn-ghost:hover,.dark .dx .btn-outline:hover{border-color:var(--accent-2);color:#fff}
`
