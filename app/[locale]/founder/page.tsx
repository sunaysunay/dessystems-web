"use client"
import { useEffect } from "react"

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

const projects = [
  { icon: "\u{1F9EC}", yr: "2023–2025", title: "S/4HANA Logistics & Greenfield Rollout", org: "Legend Biotech · Netherlands", desc: "Led S/4HANA logistics modules and external interfaces — MES, Lab System (LIMS), Data Lake — and contributed to the greenfield S/4 rollout of a new biotech facility across PP, QM, MM, EWM.", tags: ["S/4HANA", "MES", "LIMS", "Data Lake"] },
  { icon: "\u{1F6E2}️", yr: "2025–2026", title: "Custom MES ⇄ S/4HANA Integration", org: "Automotive industrial-oil manufacturer", desc: "Supported third-party custom MES and S/4HANA integrations across manufacturing components for an automotive-sector lubricants producer.", tags: ["MES", "S/4HANA", "Integration"] },
  { icon: "\u{1F3ED}", yr: "2022–2023", title: "SAP-PP Redesign & S/4 Readiness", org: "Trakya Glass Bulgaria EAD", desc: "Integrated national enterprise software with SAP, redesigned PP flows (MRP, master data) and prepared migration infrastructure for S/4HANA.", tags: ["SAP PP", "MRP", "Migration"] },
  { icon: "\u{1FA9F}", yr: "2021–2022", title: "S/4HANA Implementation — Flat Glass", org: "Şişecam Flat Glass", desc: "Consulted the SAP-PP module; designed new manufacturing processes from the SAP best-practice perspective and aligned all manufacturing systems to S/4HANA.", tags: ["S/4HANA", "SAP PP", "Best Practice"] },
  { icon: "\u{1F916}", yr: "2017–2021", title: "S/4HANA & Digital Transformation", org: "Şişecam Tableware (Paşabahçe)", desc: "Led PP, MM, QM, PM implementation for the shopfloor; collected manufacturing data via MES and streamed it into an AI Data Lake.", tags: ["S/4HANA", "MES", "AI Data Lake"] },
  { icon: "\u{1F5A5}️", yr: "2016–2017", title: "Next-gen MES Implementation", org: "Şişecam IT", desc: "Replaced legacy MES with a modern platform, upgraded shopfloor automation infrastructure and piped factory data into business-intelligence storage.", tags: ["MES", "Automation", "BI"] },
  { icon: "\u{1F4E1}", yr: "2015–2017", title: "RFID Tracking ⇄ SAP Integration", org: "Şişecam Flat Glass", desc: "Real-time goods tracking across warehouse, shipping and manufacturing — built new functionality between external RFID systems and SAP PP-WM.", tags: ["RFID", "SAP WM", "Real-time"] },
  { icon: "\u{1F50D}", yr: "2015+", title: "Shopfloor Inspection → SAP-QM", org: "Şişecam Automotive Glass", desc: "Collected all factory process-inspection values into SAP-QM: new inspection input screens plus automated capture from external automation systems.", tags: ["SAP QM", "Inspection", "Automation"] },
  { icon: "\u{1F697}", yr: "2014–2015", title: "SAP ECC — Automotive Glass", org: "Şişecam Richard Fritz", desc: "Full-cycle SAP-PP implementation for an automotive glass supplier: blueprint, shopfloor automation integration, client connection and labeling.", tags: ["SAP ECC", "Automotive", "Labeling"] },
  { icon: "\u{1F4C5}", yr: "2014–2015", title: "Advanced Planning Tool Integration", org: "Şişecam Tableware (Paşabahçe)", desc: "Integrated external advanced-planning software with SAP master and transaction data — scheduling lines by work-center capacity.", tags: ["APS", "Capacity", "SAP PP-MM"] },
  { icon: "▦", yr: "2014", title: "Conveyor Scanning ⇄ SAP", org: "Şişecam Tableware (Paşabahçe)", desc: "Adapted a conveyor scanning system and developed ERP-SAP data integration to track goods to the correct verified location.", tags: ["Scanning", "SAP PP", "Tracking"] },
  { icon: "\u{1F504}", yr: "2007–2013", title: "Oracle → SAP ECC Implementations ×3", org: "Şişecam Flat · Automotive · Tableware", desc: "Led/supported three full Oracle-to-SAP-ECC migrations: blueprints, shopfloor MES infrastructure, master data and cutover for accurate go-lives.", tags: ["SAP ECC", "Cutover", "Migration"] },
]

export default function FounderPage() {
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
            <a href="#des">DES</a>
            <a href="#architecture">Architecture</a>
            <a href="#expertise">Expertise</a>
            <a href="#delivery">Delivery</a>
            <a href="#projects">Projects</a>
            <a href="#journey">Journey</a>
            <a href="#vision">Vision</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </nav>

      <main>
        <header>
          <div className="wrap">
            <span className="eyebrow"><span className="pulse" /> Founder &middot; SAP Solution Architect &middot; Digital Manufacturing</span>
            <h1>Building the <span className="grad-text">digital backbone</span><br />of modern manufacturing.</h1>
            <p className="sub">
              <b>Sunay S.</b> is the founder of <b>DES (Digital Enterprise Solutions)</b> and an SAP Solution Architect
              with <b>20+ years</b> turning factory floors into connected, data-driven systems. From SAP S/4HANA and MES
              shopfloor integration to IoT, RFID and AI data lakes, he architects the layer where enterprise software
              meets the machine &mdash; and builds the DES ecosystem in parallel.
            </p>
            <div className="cta-row">
              <a className="btn btn-p" href="#contact">Get in touch &rarr;</a>
              <a className="btn btn-g" href="#projects">View projects</a>
            </div>
            <div className="stats">
              <div className="stat"><div className="n grad-text">20+</div><div className="l">Years in enterprise IT</div></div>
              <div className="stat"><div className="n grad-text">20+</div><div className="l">Factories consulted</div></div>
              <div className="stat"><div className="n grad-text">15+</div><div className="l">Major SAP / MES programs</div></div>
              <div className="stat"><div className="n grad-text">6</div><div className="l">Full ERP implementation cycles</div></div>
              <div className="stat"><div className="n grad-text">3</div><div className="l">Industries: Glass &middot; Biotech &middot; Oil</div></div>
            </div>
          </div>
        </header>

        {/* DES Venture */}
        <section id="des">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">The Venture</div>
              <div className="sec-title">DES &mdash; Digital Enterprise Solutions</div>
              <p className="sec-lead">The structural ecosystem Sunay founded and leads end-to-end &mdash; bringing the manufacturing, SAP and digital-transformation expertise of two decades into one platform for enterprises modernising their operations.</p>
            </div>
            <div className="venture">
              <div className="vhead">
                <div className="vlogo">DES</div>
                <div>
                  <h3>Digital Enterprise Solutions</h3>
                  <div className="vrole">Founder &amp; Solution Architect</div>
                </div>
              </div>
              <p>DES is a services-plus-product ecosystem that connects the factory floor to the enterprise: SAP S/4HANA logistics, Manufacturing Execution Systems (MES), IoT devices and data platforms, unified into a single digital thread. Built on 20+ years of hands-on implementation, DES helps manufacturers plan smarter, capture real-time production and quality data, and turn that data into intelligence &mdash; delivered as consulting, integration, and productised solutions, including the in-house <b style={{ color: "var(--text)" }}>DES BOP &mdash; Business Operations Platform</b> now in development.</p>
              <div className="pillars">
                <div className="pillar"><h4><span className="pic" />Connect</h4><p>Integrate SAP (PP, QM, MM, EWM) with MES, RFID, inspection and automation devices via web services, IDoc &amp; RFC.</p></div>
                <div className="pillar"><h4><span className="pic pic2" />Transform</h4><p>Design S/4HANA-ready manufacturing processes on SAP best practices &mdash; from greenfield rollouts to migrations.</p></div>
                <div className="pillar"><h4><span className="pic pic3" />Intelligence</h4><p>Collect shopfloor data into data lakes and BI/AI platforms for real-time visibility and smarter decisions.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Reference Architecture</div>
              <div className="sec-title">SAP S/4HANA &#8644; MES shopfloor integration</div>
              <p className="sec-lead">The signature architecture Sunay has designed and delivered repeatedly across glass, biotech and industrial-oil plants &mdash; a vertical digital thread from field devices to enterprise intelligence.</p>
            </div>
            <div className="arch">
              <h3>The DES digital thread</h3>
              <div className="cap">Level 0&ndash;4 stack &middot; every arrow is an interface Sunay has personally designed and shipped in production</div>
              <svg viewBox="0 0 1000 560" role="img" aria-label="SAP to MES integration architecture diagram">
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
                <span className="node">Order release</span><span className="arr">&rarr;</span>
                <span className="node">MES execution</span><span className="arr">&rarr;</span>
                <span className="node">Auto confirmation</span><span className="arr">&rarr;</span>
                <span className="node">Quality capture (QM)</span><span className="arr">&rarr;</span>
                <span className="node">Goods movement (MM/EWM)</span><span className="arr">&rarr;</span>
                <span className="node">Data lake &amp; analytics</span>
              </div>
            </div>
          </div>
        </section>

        {/* Expertise */}
        <section id="expertise">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Technical Depth</div>
              <div className="sec-title">Core expertise</div>
              <p className="sec-lead">The disciplines Sunay combines to architect and deliver digital manufacturing at enterprise scale &mdash; functional, technical and architectural.</p>
            </div>
            <div className="cards">
              <div className="card"><h3><span className="badge">&#x2699;&#xFE0F;</span>SAP S/4HANA Logistics</h3><p>Deep functional ownership of SAP production and logistics &mdash; design, customise, configure, test, close gaps and deliver best-practice solutions across the full supply-chain core.</p><ul><li>PP &mdash; Production Planning</li><li>QM &mdash; Quality</li><li>MM &mdash; Materials</li><li>eWM &mdash; Warehouse</li><li>SD &mdash; Sales</li><li>PM &mdash; Maintenance</li><li>S/4HANA Migration (greenfield &amp; brownfield)</li><li>Fiori</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F4D0;</span>Production Planning Mastery</h3><p>End-to-end command of the SAP-PP domain &mdash; the master-data and planning engine of any plant.</p><ul><li>MRP / MRP Live</li><li>Material Master</li><li>BOM</li><li>Routings</li><li>Work Centers</li><li>Production Versions</li><li>Capacity Planning</li><li>Production Scheduling</li><li>Order Management &amp; Confirmations</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F3ED;</span>MES &amp; Shopfloor Systems</h3><p>Setup and execution of Manufacturing Execution Systems &mdash; SAP ME/MII concepts, real-time production tracking, automated confirmation, quality data capture and equipment integration.</p><ul><li>MES / MOM</li><li>SAP ME / MII</li><li>Auto Production Confirmation</li><li>Genealogy &amp; Traceability</li><li>OEE Data</li><li>Digital Manufacturing</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F517;</span>Integration Engineering</h3><p>Connecting factory automation and external devices to SAP environments using open, standards-based interfaces &mdash; the hardest and most valuable layer of digital manufacturing.</p><ul><li>IDoc</li><li>RFC / BAPI</li><li>Web Services (SOAP/XML, WSDL)</li><li>Middleware Platforms</li><li>RFID Infrastructure</li><li>Barcode / Conveyor Scanning</li><li>Inspection Device Feeds</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F4CA;</span>Data, IoT &amp; AI Platforms</h3><p>Preparing software infrastructure for digital transformation &mdash; streaming shopfloor data into big-data storage, AI data lakes and BI platforms for real-time manufacturing intelligence.</p><ul><li>AI Data Lake</li><li>IoT Platforms</li><li>Big Data Infrastructure</li><li>Business Intelligence</li><li>Real-time Plant Visibility</li></ul></div>
              <div className="card"><h3><span className="badge">&#x1F4BB;</span>Software Engineering</h3><p>Two decades of hands-on development of custom enterprise applications &mdash; from Oracle Forms factories to ABAP extensions and web tooling &mdash; plus database design and optimisation.</p><ul><li>ABAP</li><li>PL/SQL</li><li>Oracle Forms / Reports</li><li>JDeveloper</li><li>PHP &middot; jQuery &middot; JavaScript</li><li>C++ &middot; VB</li><li>Oracle &amp; MSSQL DB Tuning</li></ul></div>
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section id="delivery">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Project Leadership</div>
              <div className="sec-title">How Sunay delivers</div>
              <p className="sec-lead">Certified in PMP and ITIL, Sunay has led full implementation lifecycles &mdash; blueprint, build, cutover, hypercare &mdash; and multi-plant rollouts, aligning senior executives, business stakeholders and technical teams around one plan.</p>
            </div>
            <div className="pmgrid">
              <div className="pm"><div className="big grad-text">Blueprint &rarr; Go-live</div><h4>Full-cycle implementation</h4><p>Project design (blueprint), master-data preparation, technical shopfloor infrastructure, cutover planning and execution &mdash; proven across six major ERP implementations, Oracle &rarr; ECC &rarr; S/4HANA.</p></div>
              <div className="pm"><div className="big grad-text">20+ plants</div><h4>Multi-plant rollout leadership</h4><p>Workflow rollouts and template deployments across flat glass, automotive glass and glassware factories &mdash; harmonising processes while respecting each plant&apos;s constraints.</p></div>
              <div className="pm"><div className="big grad-text">C-level &#8596; shopfloor</div><h4>Stakeholder alignment</h4><p>Consulting senior executives on IT-manufacturing strategy while working hands-on with operators, quality teams and automation engineers &mdash; fluent at every altitude.</p></div>
              <div className="pm"><div className="big grad-text">PMP &middot; ITIL</div><h4>Certified methods</h4><p>Formal project-management and IT-service-management discipline: scope, risk, incident and change management built into every engagement.</p></div>
              <div className="pm"><div className="big grad-text">Greenfield</div><h4>New-facility startups</h4><p>Contributed S/4HANA greenfield rollout into a brand-new biotech facility &mdash; standing up logistics, quality and lab-system integration from zero.</p></div>
              <div className="pm"><div className="big grad-text">Best practice</div><h4>SAP-standard first</h4><p>Designs processes from the SAP best-practice perspective, identifies gaps honestly, and engineers clean workarounds only where the business truly demands them.</p></div>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section id="projects">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Released Projects</div>
              <div className="sec-title">Selected delivered programs</div>
              <p className="sec-lead">A map of production-shipped work &mdash; every project below went live in a real factory.</p>
            </div>
            <div className="projgrid">
              {projects.map((p, i) => (
                <div className="proj" key={i}>
                  <div className="ptop"><span className="picon">{p.icon}</span><span className="yr">{p.yr}</span></div>
                  <h4>{p.title}</h4>
                  <div className="org">{p.org}</div>
                  <p>{p.desc}</p>
                  <div className="tags">{p.tags.map(t => <span key={t}>{t}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section id="journey">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Track Record</div>
              <div className="sec-title">The journey</div>
              <p className="sec-lead">Two decades of enterprise software &mdash; developing and deploying since 2004, across glass, biotech and industrial-oil manufacturing.</p>
            </div>
            <div className="timeline">
              <div className="tl now"><div className="yr">2026 &mdash; Present</div><h4>Founder, DES &middot; Senior SAP Consulting</h4><div className="org">Digital Enterprise Solutions &middot; Freelance</div><p>Building the DES ecosystem and the BOP platform in parallel with part-time senior SAP support &mdash; bringing 20+ years of manufacturing expertise into one product-and-services platform.</p></div>
              <div className="tl"><div className="yr">2025 &mdash; 2026</div><h4>SAP &amp; MES Integration Consultant</h4><div className="org">Automotive Industrial-Oil Manufacturer &middot; Freelance</div><p>Supported third-party custom MES and S/4HANA integrations across manufacturing components.</p></div>
              <div className="tl"><div className="yr">2023 &mdash; 2025</div><h4>S/4HANA Logistics Lead &mdash; Biotech</h4><div className="org">Legend Biotech</div><p>Led S/4HANA logistics modules and external interfaces (MES, Lab System, Data Lake); contributed to greenfield S/4 rollout of a new biotech facility across PP, QM, MM and EWM.</p></div>
              <div className="tl"><div className="yr">2020 &mdash; 2023</div><h4>SAP Logistics Consultant &mdash; S/4HANA</h4><div className="org">Trakya Glass Bulgaria &amp; &#x15E;i&#x15F;ecam &middot; Freelance</div><p>Integration between native enterprise software and SAP, redesigned SAP-PP flows (MRP, master data) and prepared infrastructure for S/4HANA migration.</p></div>
              <div className="tl"><div className="yr">2004 &mdash; 2020</div><h4>IT / SAP Specialist &amp; Solution Architect</h4><div className="org">&#x15E;i&#x15F;ecam Glass Company</div><p>Consulted 20+ glass factories (flat, automotive, glassware) and senior executives &mdash; leading ERP &amp; manufacturing implementations, MES, RFID integration, digital-transformation projects and multi-plant rollouts, from Oracle to SAP ECC to S/4HANA.</p></div>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section id="vision">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Beyond Consulting</div>
              <div className="sec-title">What drives him next</div>
              <p className="sec-lead">Sunay is a builder at heart &mdash; the consulting record funds and informs a bigger ambition: shipping his own software.</p>
            </div>
            <div className="vision">
              <div className="vcard">
                <div className="vic">&#x1F680;</div>
                <h3>DES <span>BOP</span> &mdash; Business Operations Platform</h3>
                <p>Sunay is eager to develop software systems of his own &mdash; above all the <b style={{ color: "var(--text)" }}>BOP platform</b>: a productised business-operations layer distilled from 20 years of factory integrations. The goal &mdash; give mid-size manufacturers the connected planning, execution and intelligence stack that today only enterprises can afford, without the enterprise price tag.</p>
                <div className="tags"><span>Product Engineering</span><span>Cloud-native</span><span>Manufacturing SaaS</span><span>Own IP</span></div>
              </div>
              <div className="vcard">
                <div className="vic">&#x1F697;</div>
                <h3>Automotive &amp; <span>vehicle tech</span></h3>
                <p>A lifelong fascination with cars and vehicles runs through his career &mdash; from SAP implementations for automotive-glass suppliers to inspection-data integration on automotive lines. Sunay actively explores vehicle software, connected-car systems and the manufacturing technology behind how vehicles are built.</p>
                <div className="tags"><span>Automotive Manufacturing</span><span>Vehicle Software</span><span>Connected Systems</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section id="skills">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Toolbox</div>
              <div className="sec-title">Skills &amp; credentials</div>
            </div>
            <div className="skillcols">
              <div className="skillcol"><h4>SAP</h4>
                {["PP", "QM", "MM", "eWM", "SD", "PM", "S/4HANA", "ME/MII", "Fiori", "ABAP", "IDoc / RFC / BAPI"].map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <div className="skillcol"><h4>Programming &amp; Data</h4>
                {["PL/SQL", "ABAP", "C++", "JavaScript", "PHP", "VB", "jQuery", "Oracle DB", "MSSQL", "Web Services"].map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <div className="skillcol"><h4>Certifications &amp; Methods</h4>
                {["PMP — Project Management", "ITIL — IT Service Mgmt", "SAP ERP / ABAP", "Oracle SQL / PL-SQL"].map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact">
          <div className="wrap reveal">
            <div className="contact-box">
              <h2>{"Let’s build something "}<span className="grad-text">digital</span>.</h2>
              <p>Sunay is open to consulting, partnerships and collaboration around SAP, digital manufacturing and DES. Whether you&apos;re modernising a factory or scaling an idea &mdash; reach out.</p>
              <div className="cta-row" style={{ justifyContent: "center" }}>
                <a className="btn btn-p" href="mailto:info@dessystems.io">&#x2709; info@dessystems.io</a>
                <a className="btn btn-g" href="https://linkedin.com/in/sunay-sabri-837603ba" target="_blank" rel="noopener noreferrer">in &middot; LinkedIn</a>
              </div>
            </div>
          </div>
        </section>

        <footer>
          &copy; {new Date().getFullYear()} Sunay S. &middot; Founder, DES &mdash; Digital Enterprise Solutions &middot; Netherlands
        </footer>
      </main>
    </div>
  )
}
