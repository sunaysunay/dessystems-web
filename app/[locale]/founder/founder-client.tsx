"use client"
import { useEffect } from "react"
import { useTranslations } from "next-intl"

const css = `
:root{--bg:#0a0c12;--bg-2:#0e1220;--card:#12172480;--stroke:#232a3d;--stroke-2:#2f3a56;
  --text:#e8ecf6;--muted:#9aa5bd;--faint:#67718c;
  --accent:#5b9dff;--accent-2:#8b6dff;--accent-3:#37e0c8;--amber:#ffb454;
  --grad:linear-gradient(120deg,#5b9dff,#8b6dff 55%,#37e0c8)}
.fx{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.fx *{box-sizing:border-box;margin:0;padding:0}
.fx a{color:inherit;text-decoration:none}
.fx .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.fx .grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.fx .glow{position:fixed;border-radius:50%;filter:blur(120px);opacity:.26;z-index:0;pointer-events:none}
.fx .glow-a{width:520px;height:520px;background:#5b9dff;top:-160px;right:-120px}
.fx .glow-b{width:480px;height:480px;background:#8b6dff;top:700px;left:-200px}
.fx .glow-c{width:420px;height:420px;background:#37e0c8;top:1800px;right:-160px;opacity:.16}
.fx .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);
  background-size:44px 44px;mask-image:radial-gradient(circle at 50% 18%,#000,transparent 75%)}
.fx main{position:relative;z-index:1}
.fx nav{position:sticky;top:0;z-index:20;backdrop-filter:blur(14px);background:#0a0c12b0;border-bottom:1px solid var(--stroke)}
.fx nav .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.fx .brand{font-weight:700;letter-spacing:.5px;display:flex;align-items:center;gap:10px}
.fx .brand .dot{width:26px;height:26px;border-radius:8px;background:var(--grad);display:grid;place-items:center;font-size:13px;color:#0a0c12;font-weight:800}
.fx .navlinks{display:flex;gap:22px;font-size:13.5px;color:var(--muted)}
.fx .navlinks a:hover{color:var(--text)}
@media(max-width:860px){.fx .navlinks{display:none}}
.fx header{padding:88px 0 66px;position:relative}
.fx .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;letter-spacing:2px;text-transform:uppercase;
  color:var(--accent);border:1px solid var(--stroke-2);padding:7px 14px;border-radius:100px;background:#5b9dff10;margin-bottom:26px}
.fx .pulse{width:7px;height:7px;border-radius:50%;background:var(--accent-3);animation:fpulse 2.2s infinite}
@keyframes fpulse{0%{box-shadow:0 0 0 0 #37e0c880}70%{box-shadow:0 0 0 9px #37e0c800}100%{box-shadow:0 0 0 0 #37e0c800}}
.fx h1{font-size:clamp(38px,6vw,66px);line-height:1.05;font-weight:800;letter-spacing:-1.5px}
.fx .sub{font-size:clamp(16.5px,2.2vw,21px);color:var(--muted);margin-top:22px;max-width:780px}
.fx .sub b{color:var(--text);font-weight:600}
.fx .cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:36px}
.fx .btn{padding:13px 24px;border-radius:12px;font-weight:600;font-size:15px;border:1px solid transparent;transition:.2s;display:inline-flex;align-items:center;gap:9px}
.fx .btn-p{background:var(--grad);color:#0a0c12}
.fx .btn-p:hover{transform:translateY(-2px);box-shadow:0 12px 30px -10px #5b9dff90}
.fx .btn-g{border-color:var(--stroke-2);color:var(--text)}
.fx .btn-g:hover{background:#ffffff08;border-color:var(--accent)}
.fx .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:52px}
.fx .stat{background:var(--card);border:1px solid var(--stroke);border-radius:16px;padding:20px 16px;backdrop-filter:blur(8px)}
.fx .stat .n{font-size:28px;font-weight:800;letter-spacing:-1px}
.fx .stat .l{font-size:12px;color:var(--muted);margin-top:4px;letter-spacing:.3px}
@media(max-width:860px){.fx .stats{grid-template-columns:repeat(2,1fr)}}
.fx section{padding:72px 0;border-top:1px solid var(--stroke)}
.fx .sec-head{margin-bottom:42px}
.fx .sec-tag{font-size:12.5px;letter-spacing:2.5px;text-transform:uppercase;color:var(--accent-2);font-weight:600}
.fx .sec-title{font-size:clamp(26px,4vw,40px);font-weight:800;letter-spacing:-1px;margin-top:12px}
.fx .sec-lead{color:var(--muted);margin-top:14px;max-width:780px;font-size:16px}
.fx .venture{background:linear-gradient(160deg,#141a2e,#0e1220);border:1px solid var(--stroke-2);border-radius:24px;padding:44px;position:relative;overflow:hidden}
.fx .venture::before{content:"";position:absolute;top:-60px;right:-60px;width:260px;height:260px;background:var(--grad);opacity:.16;filter:blur(60px);pointer-events:none}
.fx .venture>*{position:relative;z-index:1}
.fx .vhead{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.fx .vlogo{width:56px;height:56px;border-radius:16px;background:var(--grad);display:grid;place-items:center;font-weight:800;color:#0a0c12;font-size:20px}
.fx .venture h3{font-size:26px;font-weight:800;letter-spacing:-.5px}
.fx .vrole{font-size:13px;color:var(--accent-3);letter-spacing:.5px;text-transform:uppercase;font-weight:600}
.fx .venture p{color:var(--muted);margin-top:20px;font-size:16px;max-width:840px}
.fx .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}
.fx .pillar{background:#0a0c1266;border:1px solid var(--stroke);border-radius:14px;padding:20px}
.fx .pillar h4{font-size:15.5px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:9px}
.fx .pic{width:9px;height:9px;border-radius:3px;display:inline-block;background:var(--accent)}
.fx .pic2{background:var(--accent-2)}
.fx .pic3{background:var(--accent-3)}
.fx .pillar p{font-size:14px;color:var(--faint);margin-top:0}
@media(max-width:760px){.fx .venture{padding:28px}.fx .pillars{grid-template-columns:1fr}}
.fx .arch{background:var(--card);border:1px solid var(--stroke);border-radius:20px;padding:30px;margin-top:26px;backdrop-filter:blur(8px)}
.fx .arch h3{font-size:18px;font-weight:700;margin-bottom:6px}
.fx .arch .cap{font-size:13.5px;color:var(--faint);margin-bottom:18px}
.fx .arch svg{width:100%;height:auto;display:block}
.fx .arch text{font-family:inherit}
.fx .flowline{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px;font-size:12.5px}
.fx .flowline .node{background:#ffffff09;border:1px solid var(--stroke-2);padding:6px 12px;border-radius:8px;font-weight:600}
.fx .flowline .arr{color:var(--accent);font-weight:800}
.fx .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.fx .card{background:var(--card);border:1px solid var(--stroke);border-radius:18px;padding:26px;backdrop-filter:blur(8px);transition:.2s}
.fx .card:hover{border-color:var(--stroke-2);transform:translateY(-3px)}
.fx .card h3{font-size:18.5px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:11px}
.fx .badge{width:34px;height:34px;border-radius:10px;background:#5b9dff18;border:1px solid var(--stroke-2);display:grid;place-items:center;font-size:17px;flex-shrink:0}
.fx .card p{color:var(--muted);font-size:14.5px}
.fx .card ul{list-style:none;margin-top:14px;display:flex;flex-wrap:wrap;gap:8px}
.fx .card ul li{font-size:12.5px;color:var(--text);background:#ffffff09;border:1px solid var(--stroke);padding:5px 11px;border-radius:8px}
@media(max-width:760px){.fx .cards{grid-template-columns:1fr}}
.fx .pmgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.fx .pm{background:var(--card);border:1px solid var(--stroke);border-radius:18px;padding:26px}
.fx .pm .big{font-size:34px;font-weight:800;letter-spacing:-1px}
.fx .pm h4{font-size:16px;font-weight:700;margin-top:8px}
.fx .pm p{font-size:13.5px;color:var(--faint);margin-top:8px}
@media(max-width:760px){.fx .pmgrid{grid-template-columns:1fr}}
.fx .projgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.fx .proj{background:var(--card);border:1px solid var(--stroke);border-radius:16px;padding:22px;transition:.2s;display:flex;flex-direction:column}
.fx .proj:hover{border-color:var(--accent);transform:translateY(-3px)}
.fx .proj .ptop{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.fx .proj .picon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:18px;background:#5b9dff15;border:1px solid var(--stroke-2)}
.fx .proj .yr{font-size:11.5px;color:var(--accent);font-weight:700;letter-spacing:.5px;background:#5b9dff12;border:1px solid var(--stroke-2);padding:4px 10px;border-radius:100px}
.fx .proj h4{font-size:15.5px;font-weight:700;line-height:1.35}
.fx .proj .org{font-size:12px;color:var(--faint);margin-top:3px}
.fx .proj p{font-size:13px;color:var(--muted);margin-top:10px;flex:1}
.fx .proj .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.fx .proj .tags span{font-size:11px;color:var(--accent-3);background:#37e0c810;border:1px solid #37e0c825;padding:3px 9px;border-radius:6px;font-weight:600}
@media(max-width:960px){.fx .projgrid{grid-template-columns:1fr 1fr}}
@media(max-width:640px){.fx .projgrid{grid-template-columns:1fr}}
.fx .timeline{position:relative;padding-left:28px}
.fx .timeline::before{content:"";position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:linear-gradient(var(--accent),var(--accent-2),transparent)}
.fx .tl{position:relative;padding:0 0 32px 8px}
.fx .tl::before{content:"";position:absolute;left:-27px;top:5px;width:13px;height:13px;border-radius:50%;background:var(--bg);border:2px solid var(--accent)}
.fx .tl.now::before{background:var(--accent-3);border-color:var(--accent-3);box-shadow:0 0 0 4px #37e0c825}
.fx .yr{font-size:12.5px;color:var(--accent);font-weight:600;letter-spacing:.5px}
.fx .tl h4{font-size:17px;font-weight:700;margin-top:3px}
.fx .org{font-size:13.5px;color:var(--faint);margin-top:1px}
.fx .tl p{font-size:14.5px;color:var(--muted);margin-top:9px;max-width:780px}
.fx .vision{display:grid;grid-template-columns:1.15fr 1fr;gap:20px}
.fx .vcard{background:linear-gradient(160deg,#141a2e,#0e1220);border:1px solid var(--stroke-2);border-radius:20px;padding:32px;position:relative;overflow:hidden}
.fx .vcard::before{content:"";position:absolute;top:-50px;right:-50px;width:200px;height:200px;background:var(--grad);opacity:.13;filter:blur(50px);pointer-events:none}
.fx .vcard>*{position:relative;z-index:1}
.fx .vcard .vic{font-size:26px;margin-bottom:14px}
.fx .vcard h3{font-size:20px;font-weight:800;letter-spacing:-.3px}
.fx .vcard h3 span{color:var(--accent-3)}
.fx .vcard p{font-size:14.5px;color:var(--muted);margin-top:12px}
.fx .vcard .tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.fx .vcard .tags span{font-size:12px;color:var(--text);background:#ffffff09;border:1px solid var(--stroke);padding:5px 11px;border-radius:8px}
@media(max-width:760px){.fx .vision{grid-template-columns:1fr}}
.fx .skillcols{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.fx .skillcol h4{font-size:13px;text-transform:uppercase;letter-spacing:1.5px;color:var(--accent-2);margin-bottom:14px}
.fx .tag{display:inline-block;font-size:13px;color:var(--text);background:#ffffff08;border:1px solid var(--stroke);padding:6px 12px;border-radius:8px;margin:0 6px 8px 0}
@media(max-width:760px){.fx .skillcols{grid-template-columns:1fr 1fr}}
.fx .contact-box{text-align:center;background:linear-gradient(160deg,#141a2e,#0e1220);border:1px solid var(--stroke-2);border-radius:24px;padding:56px 28px;position:relative;overflow:hidden}
.fx .contact-box::before{content:"";position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);width:400px;height:280px;background:var(--grad);opacity:.14;filter:blur(70px);pointer-events:none;z-index:0}
.fx .contact-box>*{position:relative;z-index:1}
.fx .contact-box h2{font-size:clamp(26px,4vw,40px);font-weight:800;letter-spacing:-1px}
.fx .contact-box p{color:var(--muted);margin:16px auto 30px;max-width:560px}
.fx footer{padding:40px 0 60px;text-align:center;color:var(--faint);font-size:13px;border-top:1px solid var(--stroke)}
.fx .reveal{opacity:0;transform:translateY(24px);transition:.7s cubic-bezier(.2,.7,.2,1)}
.fx .reveal.in{opacity:1;transform:none}
`

const projectMeta = [
  { icon: "\u{1F9EC}", yr: "2023–2025", org: "Legend Biotech · Netherlands", tags: ["S/4HANA", "MES", "LIMS", "Data Lake"] },
  { icon: "\u{1F6E2}️", yr: "2025–2026", org: "Automotive industrial-oil manufacturer", tags: ["MES", "S/4HANA", "Integration"] },
  { icon: "\u{1F3ED}", yr: "2022–2023", org: "Trakya Glass Bulgaria EAD", tags: ["SAP PP", "MRP", "Migration"] },
  { icon: "\u{1FA9F}", yr: "2021–2022", org: "Şişecam Flat Glass", tags: ["S/4HANA", "SAP PP", "Best Practice"] },
  { icon: "\u{1F916}", yr: "2017–2021", org: "Şişecam Tableware (Paşabahçe)", tags: ["S/4HANA", "MES", "AI Data Lake"] },
  { icon: "\u{1F5A5}️", yr: "2016–2017", org: "Şişecam IT", tags: ["MES", "Automation", "BI"] },
  { icon: "\u{1F4E1}", yr: "2015–2017", org: "Şişecam Flat Glass", tags: ["RFID", "SAP WM", "Real-time"] },
  { icon: "\u{1F50D}", yr: "2015+", org: "Şişecam Automotive Glass", tags: ["SAP QM", "Inspection", "Automation"] },
  { icon: "\u{1F697}", yr: "2014–2015", org: "Şişecam Richard Fritz", tags: ["SAP ECC", "Automotive", "Labeling"] },
  { icon: "\u{1F4C5}", yr: "2014–2015", org: "Şişecam Tableware (Paşabahçe)", tags: ["APS", "Capacity", "SAP PP-MM"] },
  { icon: "▦", yr: "2014", org: "Şişecam Tableware (Paşabahçe)", tags: ["Scanning", "SAP PP", "Tracking"] },
  { icon: "\u{1F504}", yr: "2007–2013", org: "Şişecam Flat · Automotive · Tableware", tags: ["SAP ECC", "Cutover", "Migration"] },
]

export default function FounderClient() {
  const t = useTranslations("Founder")

  const projects = projectMeta.map((p, i) => ({
    ...p,
    title: t(`proj${i + 1}_title`),
    desc: t(`proj${i + 1}_desc`),
  }))

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in") }),
      { threshold: 0.08 }
    )
    document.querySelectorAll(".fx .reveal").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="fx">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="grid-bg" />
      <div className="glow glow-a" /><div className="glow glow-b" /><div className="glow glow-c" />

      <nav>
        <div className="wrap">
          <div className="brand"><span className="dot">S</span> Sunay&nbsp;S.</div>
          <div className="navlinks">
            <a href="#des">{t("nav_des")}</a>
            <a href="#architecture">{t("nav_architecture")}</a>
            <a href="#expertise">{t("nav_expertise")}</a>
            <a href="#delivery">{t("nav_delivery")}</a>
            <a href="#projects">{t("nav_projects")}</a>
            <a href="#journey">{t("nav_journey")}</a>
            <a href="#vision">{t("nav_vision")}</a>
            <a href="#contact">{t("nav_contact")}</a>
          </div>
        </div>
      </nav>

      <main>
        <header>
          <div className="wrap">
            <span className="eyebrow"><span className="pulse" /> {t("eyebrow")}</span>
            <h1>{t("h1_pre")} <span className="grad-text">{t("h1_grad")}</span><br />{t("h1_post")}</h1>
            <p className="sub">
              {t.rich("sub", { b: (chunks) => <b>{chunks}</b> })}
            </p>
            <div className="cta-row">
              <a className="btn btn-p" href="#contact">{t("cta_contact")}</a>
              <a className="btn btn-g" href="#projects">{t("cta_projects")}</a>
            </div>
            <div className="stats">
              <div className="stat"><div className="n grad-text">20+</div><div className="l">{t("stat1")}</div></div>
              <div className="stat"><div className="n grad-text">20+</div><div className="l">{t("stat2")}</div></div>
              <div className="stat"><div className="n grad-text">15+</div><div className="l">{t("stat3")}</div></div>
              <div className="stat"><div className="n grad-text">6</div><div className="l">{t("stat4")}</div></div>
              <div className="stat"><div className="n grad-text">3</div><div className="l">{t("stat5")}</div></div>
            </div>
          </div>
        </header>

        {/* DES Venture */}
        <section id="des">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("des_tag")}</div>
              <div className="sec-title">{t("des_title")}</div>
              <p className="sec-lead">{t("des_lead")}</p>
            </div>
            <div className="venture">
              <div className="vhead">
                <div className="vlogo">DES</div>
                <div>
                  <h3>{t("venture_name")}</h3>
                  <div className="vrole">{t("venture_role")}</div>
                </div>
              </div>
              <p>{t.rich("venture_p", { b: (chunks) => <b style={{ color: "var(--text)" }}>{chunks}</b> })}</p>
              <div className="pillars">
                <div className="pillar"><h4><span className="pic" />{t("pillar1_h")}</h4><p>{t("pillar1_p")}</p></div>
                <div className="pillar"><h4><span className="pic pic2" />{t("pillar2_h")}</h4><p>{t("pillar2_p")}</p></div>
                <div className="pillar"><h4><span className="pic pic3" />{t("pillar3_h")}</h4><p>{t("pillar3_p")}</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("arch_tag")}</div>
              <div className="sec-title">{t("arch_title")}</div>
              <p className="sec-lead">{t("arch_lead")}</p>
            </div>
            <div className="arch">
              <h3>{t("arch_h3")}</h3>
              <div className="cap">{t("arch_cap")}</div>
              <svg viewBox="0 0 1000 560" role="img" aria-label={t("arch_aria")}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#5b9dff" /><stop offset=".55" stopColor="#8b6dff" /><stop offset="1" stopColor="#37e0c8" />
                  </linearGradient>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10 z" fill="#5b9dff" />
                  </marker>
                  <marker id="arrowT" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10 z" fill="#37e0c8" />
                  </marker>
                </defs>
                {/* Level labels */}
                <text x="16" y="52" fill="#67718c" fontSize="11" letterSpacing="2">L4 &middot; ENTERPRISE</text>
                <text x="16" y="188" fill="#67718c" fontSize="11" letterSpacing="2">L3 &middot; MES / MOM</text>
                <text x="16" y="330" fill="#67718c" fontSize="11" letterSpacing="2">L2 &middot; SCADA / EDGE</text>
                <text x="16" y="462" fill="#67718c" fontSize="11" letterSpacing="2">L0&ndash;1 &middot; FIELD</text>
                {/* L4 ERP */}
                <rect x="150" y="20" width="560" height="86" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="176" y="52" fill="#e8ecf6" fontSize="16" fontWeight="700">SAP S/4HANA</text>
                <text x="176" y="74" fill="#9aa5bd" fontSize="12">PP &middot; QM &middot; MM &middot; EWM &middot; SD &middot; PM  |  MRP &middot; BOM &middot; Routings &middot; Capacity &middot; Orders</text>
                <rect x="560" y="36" width="130" height="24" rx="6" fill="#5b9dff18" stroke="#2f3a56" /><text x="625" y="52" fill="#5b9dff" fontSize="11" textAnchor="middle" fontWeight="700">Fiori / ABAP</text>
                <rect x="560" y="66" width="130" height="24" rx="6" fill="#8b6dff18" stroke="#2f3a56" /><text x="625" y="82" fill="#8b6dff" fontSize="11" textAnchor="middle" fontWeight="700">MRP Live</text>
                {/* Data lake */}
                <rect x="760" y="20" width="220" height="86" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="870" y="52" fill="#e8ecf6" fontSize="15" fontWeight="700" textAnchor="middle">AI Data Lake &middot; BI</text>
                <text x="870" y="74" fill="#9aa5bd" fontSize="11.5" textAnchor="middle">Analytics &middot; Dashboards &middot; ML</text>
                {/* Middleware */}
                <rect x="150" y="136" width="830" height="34" rx="10" fill="url(#g1)" opacity=".14" />
                <rect x="150" y="136" width="830" height="34" rx="10" fill="none" stroke="#2f3a56" />
                <text x="565" y="158" fill="#e8ecf6" fontSize="12.5" textAnchor="middle" fontWeight="700">Integration layer &mdash; IDoc &middot; RFC/BAPI &middot; Web Services (SOAP/XML &middot; WSDL) &middot; Middleware &middot; OData</text>
                {/* L3 MES */}
                <rect x="150" y="196" width="400" height="92" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="176" y="228" fill="#e8ecf6" fontSize="16" fontWeight="700">MES / Digital Manufacturing</text>
                <text x="176" y="250" fill="#9aa5bd" fontSize="12">SAP ME / MII concepts &middot; production confirmation</text>
                <text x="176" y="268" fill="#9aa5bd" fontSize="12">quality capture &middot; genealogy &middot; OEE &middot; traceability</text>
                <rect x="580" y="196" width="190" height="92" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="675" y="228" fill="#e8ecf6" fontSize="14" fontWeight="700" textAnchor="middle">Advanced Planning</text>
                <text x="675" y="250" fill="#9aa5bd" fontSize="11.5" textAnchor="middle">Capacity scheduling</text>
                <text x="675" y="266" fill="#9aa5bd" fontSize="11.5" textAnchor="middle">Line sequencing</text>
                <rect x="800" y="196" width="180" height="92" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="890" y="228" fill="#e8ecf6" fontSize="14" fontWeight="700" textAnchor="middle">LIMS / Lab</text>
                <text x="890" y="250" fill="#9aa5bd" fontSize="11.5" textAnchor="middle">Inspection results</text>
                <text x="890" y="266" fill="#9aa5bd" fontSize="11.5" textAnchor="middle">&rarr; SAP QM lots</text>
                {/* L2 */}
                <rect x="150" y="318" width="830" height="64" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="176" y="344" fill="#e8ecf6" fontSize="15" fontWeight="700">SCADA &middot; Edge &middot; Automation gateways</text>
                <text x="176" y="366" fill="#9aa5bd" fontSize="12">Real-time shopfloor data collection &middot; machine signals &middot; conveyor tracking &middot; IoT telemetry</text>
                {/* L0-1 devices */}
                <rect x="150" y="412" width="190" height="70" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="245" y="442" fill="#e8ecf6" fontSize="13.5" fontWeight="700" textAnchor="middle">&#x1F4E1; RFID</text>
                <text x="245" y="462" fill="#9aa5bd" fontSize="11" textAnchor="middle">Real-time goods tracking</text>
                <rect x="366" y="412" width="190" height="70" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="461" y="442" fill="#e8ecf6" fontSize="13.5" fontWeight="700" textAnchor="middle">&#x25A6; Barcode / Scanners</text>
                <text x="461" y="462" fill="#9aa5bd" fontSize="11" textAnchor="middle">Conveyor scanning systems</text>
                <rect x="582" y="412" width="190" height="70" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="677" y="442" fill="#e8ecf6" fontSize="13.5" fontWeight="700" textAnchor="middle">&#x1F50D; Inspection devices</text>
                <text x="677" y="462" fill="#9aa5bd" fontSize="11" textAnchor="middle">Process quality values</text>
                <rect x="798" y="412" width="182" height="70" rx="14" fill="#12172480" stroke="#2f3a56" />
                <text x="889" y="442" fill="#e8ecf6" fontSize="13.5" fontWeight="700" textAnchor="middle">&#x2699; PLC / Machines</text>
                <text x="889" y="462" fill="#9aa5bd" fontSize="11" textAnchor="middle">Production lines</text>
                {/* Arrows */}
                <line x1="350" y1="106" x2="350" y2="134" stroke="#5b9dff" strokeWidth="2" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                <line x1="350" y1="170" x2="350" y2="194" stroke="#5b9dff" strokeWidth="2" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                <line x1="675" y1="170" x2="675" y2="194" stroke="#5b9dff" strokeWidth="2" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                <line x1="890" y1="170" x2="890" y2="194" stroke="#5b9dff" strokeWidth="2" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                <line x1="350" y1="288" x2="350" y2="316" stroke="#37e0c8" strokeWidth="2" markerEnd="url(#arrowT)" markerStart="url(#arrowT)" />
                <line x1="675" y1="288" x2="675" y2="316" stroke="#37e0c8" strokeWidth="2" markerEnd="url(#arrowT)" />
                <line x1="245" y1="410" x2="245" y2="384" stroke="#37e0c8" strokeWidth="2" markerEnd="url(#arrowT)" />
                <line x1="461" y1="410" x2="461" y2="384" stroke="#37e0c8" strokeWidth="2" markerEnd="url(#arrowT)" />
                <line x1="677" y1="410" x2="677" y2="384" stroke="#37e0c8" strokeWidth="2" markerEnd="url(#arrowT)" />
                <line x1="889" y1="410" x2="889" y2="384" stroke="#37e0c8" strokeWidth="2" markerEnd="url(#arrowT)" />
                <line x1="710" y1="63" x2="758" y2="63" stroke="#8b6dff" strokeWidth="2" markerEnd="url(#arrow)" />
                <path d="M 550 220 C 740 120, 800 120, 862 108" fill="none" stroke="#37e0c8" strokeWidth="1.6" strokeDasharray="5 5" markerEnd="url(#arrowT)" />
                <text x="742" y="128" fill="#37e0c8" fontSize="10.5">shopfloor data &rarr; lake</text>
              </svg>
              <div className="flowline">
                <span className="node">{t("flow1")}</span><span className="arr">&rarr;</span>
                <span className="node">{t("flow2")}</span><span className="arr">&rarr;</span>
                <span className="node">{t("flow3")}</span><span className="arr">&rarr;</span>
                <span className="node">{t("flow4")}</span><span className="arr">&rarr;</span>
                <span className="node">{t("flow5")}</span><span className="arr">&rarr;</span>
                <span className="node">{t("flow6")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Expertise */}
        <section id="expertise">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("exp_tag")}</div>
              <div className="sec-title">{t("exp_title")}</div>
              <p className="sec-lead">{t("exp_lead")}</p>
            </div>
            <div className="cards">
              <div className="card"><h3><span className="badge">&#x2699;&#xFE0F;</span>{t("exp1_h")}</h3><p>{t("exp1_p")}</p><ul><li>PP &mdash; Production Planning</li><li>QM &mdash; Quality</li><li>MM &mdash; Materials</li><li>eWM &mdash; Warehouse</li><li>SD &mdash; Sales</li><li>PM &mdash; Maintenance</li><li>S/4HANA Migration (greenfield &amp; brownfield)</li><li>Fiori</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F4D0;</span>{t("exp2_h")}</h3><p>{t("exp2_p")}</p><ul><li>MRP / MRP Live</li><li>Material Master</li><li>BOM</li><li>Routings</li><li>Work Centers</li><li>Production Versions</li><li>Capacity Planning</li><li>Production Scheduling</li><li>Order Management &amp; Confirmations</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F3ED;</span>{t("exp3_h")}</h3><p>{t("exp3_p")}</p><ul><li>MES / MOM</li><li>SAP ME / MII</li><li>Auto Production Confirmation</li><li>Genealogy &amp; Traceability</li><li>OEE Data</li><li>Digital Manufacturing</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F517;</span>{t("exp4_h")}</h3><p>{t("exp4_p")}</p><ul><li>IDoc</li><li>RFC / BAPI</li><li>Web Services (SOAP/XML, WSDL)</li><li>Middleware Platforms</li><li>RFID Infrastructure</li><li>Barcode / Conveyor Scanning</li><li>Inspection Device Feeds</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F4CA;</span>{t("exp5_h")}</h3><p>{t("exp5_p")}</p><ul><li>AI Data Lake</li><li>IoT Platforms</li><li>Big Data Infrastructure</li><li>Business Intelligence</li><li>Real-time Plant Visibility</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F4BB;</span>{t("exp6_h")}</h3><p>{t("exp6_p")}</p><ul><li>ABAP</li><li>PL/SQL</li><li>Oracle Forms / Reports</li><li>JDeveloper</li><li>PHP &middot; jQuery &middot; JavaScript</li><li>C++ &middot; VB</li><li>Oracle &amp; MSSQL DB Tuning</li></ul></div>
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section id="delivery">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("del_tag")}</div>
              <div className="sec-title">{t("del_title")}</div>
              <p className="sec-lead">{t("del_lead")}</p>
            </div>
            <div className="pmgrid">
              <div className="pm"><div className="big grad-text">{t("pm1_big")}</div><h4>{t("pm1_h")}</h4><p>{t("pm1_p")}</p></div>
              <div className="pm"><div className="big grad-text">{t("pm2_big")}</div><h4>{t("pm2_h")}</h4><p>{t("pm2_p")}</p></div>
              <div className="pm"><div className="big grad-text">{t("pm3_big")}</div><h4>{t("pm3_h")}</h4><p>{t("pm3_p")}</p></div>
              <div className="pm"><div className="big grad-text">{t("pm4_big")}</div><h4>{t("pm4_h")}</h4><p>{t("pm4_p")}</p></div>
              <div className="pm"><div className="big grad-text">{t("pm5_big")}</div><h4>{t("pm5_h")}</h4><p>{t("pm5_p")}</p></div>
              <div className="pm"><div className="big grad-text">{t("pm6_big")}</div><h4>{t("pm6_h")}</h4><p>{t("pm6_p")}</p></div>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section id="projects">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("proj_tag")}</div>
              <div className="sec-title">{t("proj_title")}</div>
              <p className="sec-lead">{t("proj_lead")}</p>
            </div>
            <div className="projgrid">
              {projects.map((p, i) => (
                <div className="proj" key={i}>
                  <div className="ptop"><span className="picon">{p.icon}</span><span className="yr">{p.yr}</span></div>
                  <h4>{p.title}</h4>
                  <div className="org">{p.org}</div>
                  <p>{p.desc}</p>
                  <div className="tags">{p.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section id="journey">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("journey_tag")}</div>
              <div className="sec-title">{t("journey_title")}</div>
              <p className="sec-lead">{t("journey_lead")}</p>
            </div>
            <div className="timeline">
              <div className="tl now"><div className="yr">{t("tl1_yr")}</div><h4>{t("tl1_h")}</h4><div className="org">{t("tl1_org")}</div><p>{t("tl1_p")}</p></div>
              <div className="tl"><div className="yr">{t("tl2_yr")}</div><h4>{t("tl2_h")}</h4><div className="org">{t("tl2_org")}</div><p>{t("tl2_p")}</p></div>
              <div className="tl"><div className="yr">{t("tl3_yr")}</div><h4>{t("tl3_h")}</h4><div className="org">{t("tl3_org")}</div><p>{t("tl3_p")}</p></div>
              <div className="tl"><div className="yr">{t("tl4_yr")}</div><h4>{t("tl4_h")}</h4><div className="org">{t("tl4_org")}</div><p>{t("tl4_p")}</p></div>
              <div className="tl"><div className="yr">{t("tl5_yr")}</div><h4>{t("tl5_h")}</h4><div className="org">{t("tl5_org")}</div><p>{t("tl5_p")}</p></div>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section id="vision">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("vision_tag")}</div>
              <div className="sec-title">{t("vision_title")}</div>
              <p className="sec-lead">{t("vision_lead")}</p>
            </div>
            <div className="vision">
              <div className="vcard">
                <div className="vic">&#x1F680;</div>
                <h3>{t.rich("v1_h", { span: (chunks) => <span>{chunks}</span> })}</h3>
                <p>{t.rich("v1_p", { b: (chunks) => <b style={{ color: "var(--text)" }}>{chunks}</b> })}</p>
                <div className="tags"><span>{t("v1_tag1")}</span><span>{t("v1_tag2")}</span><span>{t("v1_tag3")}</span><span>{t("v1_tag4")}</span></div>
              </div>
              <div className="vcard">
                <div className="vic">&#x1F697;</div>
                <h3>{t.rich("v2_h", { span: (chunks) => <span>{chunks}</span> })}</h3>
                <p>{t("v2_p")}</p>
                <div className="tags"><span>{t("v2_tag1")}</span><span>{t("v2_tag2")}</span><span>{t("v2_tag3")}</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section id="skills">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">{t("skills_tag")}</div>
              <div className="sec-title">{t("skills_title")}</div>
            </div>
            <div className="skillcols">
              <div className="skillcol"><h4>{t("skills_col1")}</h4>
                {["PP", "QM", "MM", "eWM", "SD", "PM", "S/4HANA", "ME/MII", "Fiori", "ABAP", "IDoc / RFC / BAPI"].map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
              <div className="skillcol"><h4>{t("skills_col2")}</h4>
                {["PL/SQL", "ABAP", "C++", "JavaScript", "PHP", "VB", "jQuery", "Oracle DB", "MSSQL", "Web Services"].map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
              <div className="skillcol"><h4>{t("skills_col3")}</h4>
                {[t("cert1"), t("cert2"), t("cert3"), t("cert4")].map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact">
          <div className="wrap reveal">
            <div className="contact-box">
              <h2>{t("contact_pre")} <span className="grad-text">{t("contact_grad")}</span>.</h2>
              <p>{t("contact_p")}</p>
              <div className="cta-row" style={{ justifyContent: "center" }}>
                <a className="btn btn-p" href="mailto:info@dessystems.io">&#x2709; info@dessystems.io</a>
                <a className="btn btn-g" href="https://linkedin.com/in/sunay-sabri-837603ba" target="_blank" rel="noopener noreferrer">in &middot; LinkedIn</a>
              </div>
            </div>
          </div>
        </section>

        <footer>
          &copy; {new Date().getFullYear()} {t("footer")}
        </footer>
      </main>
    </div>
  )
}
