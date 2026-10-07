import { Geist, Geist_Mono } from "next/font/google"

// Shared "sx" design system for marketing pages (solutions, services):
// Geist / Geist Mono, blue-on-ink palette, square edges, hairline borders.

const geist = Geist({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], display: "swap", variable: "--font-geist-mono" })

export const sxClass = `sx ${geist.variable} ${geistMono.variable}`

export const sxCss = `
.sx{
  --s-bg:#F5F6F8;--s-surface:#fff;--s-ink:#0B1220;--s-body:#3B4454;--s-muted:#5B6474;--s-faint:#8A93A3;
  --s-line:#E3E6EC;--s-line2:#C9CED8;--s-chip:#F1F3F7;--s-bar:#FAFBFC;--s-accent:#2563EB;--s-accent-h:#1D4ED8;
  --s-row:#F7F8FA;--s-deep:#0B1220;--s-deep-line:#222C3F;
  --s-sans:var(--font-geist),'Geist',system-ui,sans-serif;--s-mono:var(--font-geist-mono),'Geist Mono',ui-monospace,monospace;
  background:var(--s-bg);color:var(--s-ink);font-family:var(--s-sans);-webkit-font-smoothing:antialiased;padding-top:64px
}
html.dark .sx{
  --s-bg:#0B1220;--s-surface:#111A2B;--s-ink:#F1F4F9;--s-body:#B4BCCB;--s-muted:#97A1B3;--s-faint:#6B7485;
  --s-line:#222C3F;--s-line2:#3A4459;--s-chip:#18223A;--s-bar:#0E1626;--s-accent:#4F8BFF;--s-accent-h:#7FA6FF;
  --s-row:#0E1626;--s-deep:#060A14;--s-deep-line:#1A2335
}
.sx *{box-sizing:border-box}
.sx-wrap{max-width:1280px;margin:0 auto;padding:0 32px}
.sx-eyebrow{font-family:var(--s-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--s-accent);margin-bottom:24px}
.sx-eyebrow-dark{color:#7FA6FF;margin-bottom:20px}
.sx-btns{display:flex;gap:12px;flex-wrap:wrap}
.sx-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 22px;font-size:15px;font-weight:500;line-height:1.2;transition:background .2s,border-color .2s,color .2s}
.sx-btn svg{width:16px;height:16px}
.sx-btn-primary{background:var(--s-accent);color:#fff}
.sx-btn-primary:hover{background:var(--s-accent-h);color:#fff}
.sx-btn-ghost{border:1px solid var(--s-line2);color:var(--s-ink)}
.sx-btn-ghost:hover{border-color:var(--s-ink)}
.sx-btn-white{background:#fff;color:#0B1220;flex:none}
.sx-btn-white:hover{background:#E8EDF7;color:#0B1220}
.sx-btn-lg{padding:16px 24px;font-size:16px;justify-content:space-between;gap:24px;min-width:280px}
.sx-h2{font-size:clamp(32px,3.6vw,48px);line-height:1.05;letter-spacing:-.03em;font-weight:600;margin:0;max-width:680px;text-wrap:balance}
.sx-head{display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between;align-items:flex-end;margin-bottom:56px}
.sx-head-p{font-size:16px;line-height:1.6;color:var(--s-muted);margin:0;max-width:400px}
.sx-section{padding-top:112px;padding-bottom:104px}
.sx-sq{width:6px;height:6px;background:var(--s-accent);flex:none;transform:translateY(-2px)}

/* hero */
.sx-hero{border-bottom:1px solid var(--s-line)}
.sx-hero-grid{padding-top:88px;padding-bottom:72px;display:flex;flex-wrap:wrap;gap:64px;align-items:flex-start}
.sx-hero-copy{flex:1 1 440px;min-width:0}
.sx-h1{font-size:clamp(40px,5.2vw,68px);line-height:1.02;letter-spacing:-.035em;font-weight:600;margin:0 0 28px;text-wrap:balance}
.sx-h1 em{font-style:normal;color:var(--s-accent)}
.sx-h1-wide{max-width:1040px}
.sx-h1 .sx-h1-2{color:var(--s-muted)}
.sx-lead{font-size:19px;line-height:1.55;color:var(--s-body);margin:0 0 16px;max-width:560px;text-wrap:pretty}
.sx-lead-wide{max-width:680px;margin-bottom:40px}
.sx-sub{font-size:15px;line-height:1.6;color:var(--s-muted);margin:0 0 40px;max-width:520px;text-wrap:pretty}
.sx-stack{flex:1 1 480px;min-width:0;background:var(--s-surface);border:1px solid var(--s-line);padding:20px;display:flex;flex-direction:column;gap:6px}
.sx-layer{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;align-items:start;padding:16px;border:1px solid var(--s-line);background:var(--s-row);transition:background .2s,border-color .2s}
.sx-layer:hover{background:#0B1220;border-color:#0B1220}
.sx-layer-code{font-family:var(--s-mono);font-size:11px;color:var(--s-faint);padding-top:3px}
.sx-layer-name{font-size:15px;font-weight:600;margin-bottom:4px}
.sx-layer-desc{font-size:13.5px;line-height:1.5;color:var(--s-muted)}
.sx-layer:hover .sx-layer-code{color:#8FB0FF}
.sx-layer:hover .sx-layer-name{color:#fff}
.sx-layer:hover .sx-layer-desc{color:#B4BCCB}

/* stats strip */
.sx-stats{background:var(--s-surface);border-bottom:1px solid var(--s-line)}
.sx-stats .sx-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.sx-stat{padding:32px 24px;border-right:1px solid var(--s-line)}
.sx-stat:first-child{padding-left:0}
.sx-stat:last-child{border-right:0}
.sx-stat b{display:block;font-size:40px;font-weight:600;letter-spacing:-.03em;line-height:1.1}
.sx-stat span{display:block;font-size:14px;color:var(--s-muted);margin-top:4px}

/* solutions: sticky index + cards */
.sx-sol-grid{display:flex;flex-wrap:wrap;gap:40px;align-items:flex-start}
.sx-index{flex:1 1 240px;position:sticky;top:96px;display:flex;flex-direction:column;border-top:1px solid var(--s-ink)}
.sx-index a{display:grid;grid-template-columns:36px minmax(0,1fr) 16px;align-items:center;padding:20px 0;border-bottom:1px solid var(--s-line);color:var(--s-muted)}
.sx-index a:hover{color:var(--s-ink)}
.sx-index .ix-code{font-family:var(--s-mono);font-size:12px;color:var(--s-faint)}
.sx-index .ix-name{font-size:18px;font-weight:500;letter-spacing:-.01em}
.sx-index .ix-dot{width:8px;height:8px;background:transparent}
.sx-index a.on{color:var(--s-ink)}
.sx-index a.on .ix-code{color:var(--s-accent)}
.sx-index a.on .ix-name{font-weight:600}
.sx-index a.on .ix-dot{background:var(--s-accent)}
.sx-articles{flex:3 1 560px;min-width:0;display:flex;flex-direction:column;gap:24px}
.sx-card{background:var(--s-surface);border:1px solid var(--s-line);scroll-margin-top:88px}
.sx-card-top{padding:40px 40px 32px;border-bottom:1px solid var(--s-line)}
.sx-card-meta{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-family:var(--s-mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--s-faint);margin-bottom:24px}
.sx-card-code{color:var(--s-accent)}
.sx-h3{font-size:clamp(26px,2.6vw,34px);line-height:1.12;letter-spacing:-.025em;font-weight:600;margin:0 0 16px;text-wrap:balance}
.sx-card-desc{font-size:16px;line-height:1.6;color:var(--s-body);margin:0;max-width:660px;text-wrap:pretty}
.sx-card-body{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.sx-scope{list-style:none;margin:0;padding:24px 40px 32px;border-right:1px solid var(--s-line)}
.sx-scope li{display:flex;gap:12px;align-items:baseline;padding:9px 0;border-bottom:1px dashed var(--s-line);font-size:15px}
.sx-scope li:last-child{border-bottom:0}
.sx-tech{padding:32px 40px}
.sx-label{font-family:var(--s-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--s-faint);margin-bottom:16px}
.sx-chips{display:flex;flex-wrap:wrap;gap:6px}
.sx-chip{font-family:var(--s-mono);font-size:12px;padding:6px 10px;background:var(--s-chip);border:1px solid var(--s-line);color:var(--s-ink)}
.sx-card-bar{display:flex;justify-content:flex-end;padding:20px 40px;background:var(--s-bar);border-top:1px solid var(--s-line)}
.sx-link{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--s-accent)}
.sx-link:hover{color:var(--s-accent-h)}
.sx-link svg{width:15px;height:15px;transition:transform .2s}
.sx-link:hover svg{transform:translateX(3px)}

/* featured card + framed live demo */
.sx-card-feature{border-top:2px solid var(--s-accent)}
.sx-demo-wrap{padding:0 40px 32px}
.sx-demo{border:1px solid var(--s-line2);background:var(--s-bg)}
.sx-demo-chrome{display:flex;align-items:center;gap:6px;padding:10px 14px;border-bottom:1px solid var(--s-line);background:var(--s-surface)}
.sx-demo-chrome>span{width:9px;height:9px;border:1px solid var(--s-line2);background:var(--s-chip)}
.sx-demo-url{margin-left:10px;flex:1;min-width:0;font-family:var(--s-mono);font-size:12px;color:var(--s-muted);padding:5px 10px;background:var(--s-chip);border:1px solid var(--s-line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sx-demo-body{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;align-items:flex-end;padding:28px 28px 28px}
.sx-demo-copy{flex:1 1 320px;min-width:0}
.sx-demo-title{font-size:20px;font-weight:600;letter-spacing:-.015em;margin-bottom:8px}
.sx-demo-copy p{font-size:15px;line-height:1.55;color:var(--s-body);margin:0;max-width:520px}
.sx-demos-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}

/* services: hairline grid of cells */
.sx-cells{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1px;background:var(--s-line);border:1px solid var(--s-line)}
.sx-cell{background:var(--s-surface);padding:32px 32px 28px;display:flex;flex-direction:column;scroll-margin-top:88px}
.sx-cell-code{font-family:var(--s-mono);font-size:11px;letter-spacing:.08em;color:var(--s-accent);margin-bottom:28px}
.sx-cell-title{font-size:20px;line-height:1.25;font-weight:600;letter-spacing:-.015em;margin:0 0 10px}
.sx-cell-desc{font-size:15px;line-height:1.55;color:var(--s-muted);margin:0 0 20px}
.sx-cell .sx-scope{padding:0;border:0;margin-top:auto}
.sx-cell .sx-scope li{font-size:14px;padding:8px 0}

/* process */
.sx-process{background:var(--s-surface);border-top:1px solid var(--s-line);border-bottom:1px solid var(--s-line)}
.sx-process .sx-h2{font-size:clamp(28px,3vw,40px);line-height:1.1;margin-bottom:16px}
.sx-process-lead{font-size:16px;line-height:1.6;color:var(--s-muted);margin:0 0 56px;max-width:560px}
.sx-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));border-top:2px solid var(--s-ink)}
.sx-step{padding:28px 28px 8px}
.sx-step:first-child{padding-left:0}
.sx-step-code{font-family:var(--s-mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--s-accent);margin-bottom:20px}
.sx-step-title{font-size:20px;font-weight:600;margin-bottom:10px}
.sx-step p{font-size:15px;line-height:1.55;color:var(--s-muted);margin:0}

/* closing cta */
.sx-cta .sx-wrap{padding-top:112px;padding-bottom:112px;display:flex;flex-wrap:wrap;gap:48px;justify-content:space-between;align-items:flex-end}
.sx-cta-copy{max-width:720px}
.sx-cta h2{font-size:clamp(36px,4.4vw,60px);line-height:1.02;letter-spacing:-.035em;font-weight:600;margin:0 0 20px;text-wrap:balance}
.sx-cta p{font-size:18px;line-height:1.55;color:var(--s-body);margin:0}

/* dark band */
.sx-band{background:var(--s-deep);color:#fff;border-top:1px solid var(--s-deep-line)}
.sx-band-inner{padding-top:104px;padding-bottom:104px;display:flex;flex-wrap:wrap;gap:48px;justify-content:space-between;align-items:flex-end}
.sx-band-copy{max-width:680px}
.sx-band .sx-h2{margin-bottom:20px}
.sx-band p{font-size:17px;line-height:1.6;color:#B4BCCB;margin:0;text-wrap:pretty}

@media(max-width:900px){
  .sx-index{display:none}
  .sx-hero-grid{padding-top:56px;padding-bottom:56px;gap:40px}
  .sx-section{padding-top:72px;padding-bottom:72px}
  .sx-band-inner,.sx-cta .sx-wrap{padding-top:72px;padding-bottom:72px}
  .sx-step{padding-left:0}
}
@media(max-width:600px){
  .sx-wrap{padding:0 16px}
  .sx-stack{padding:12px}
  .sx-card-top{padding:28px 20px 24px}
  .sx-scope{padding:16px 20px 20px;border-right:0;border-bottom:1px solid var(--s-line)}
  .sx-tech{padding:24px 20px}
  .sx-card-bar{padding:16px 20px}
  .sx-demo-wrap{padding:20px}
  .sx-demo-body{padding:20px}
  .sx-demo-body .sx-btn{width:100%;justify-content:space-between}
  .sx-lead{font-size:17px}
  .sx-cells{grid-template-columns:1fr}
  .sx-cell{padding:24px 20px}
  .sx-stat{padding:20px 0;border-right:0;border-bottom:1px solid var(--s-line)}
  .sx-stat:last-child{border-bottom:0}
  .sx-btn-lg{min-width:0;width:100%}
}
`
