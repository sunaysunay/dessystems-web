"use client"
import { useEffect } from "react"

const css = `
:root{--fg:#0a0c12;--card:#12172480;--stroke:#232a3d;--stroke-2:#2f3a56;
  --text:#e8ecf6;--muted:#9aa5bd;--faint:#67718c;
  --acc:#5b9dff;--acc2:#8b6dff;--acc3:#37e0c8;
  --grad:linear-gradient(120deg,#5b9dff,#8b6dff 55%,#37e0c8)}
.fx{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;
  background:var(--fg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.fx *{box-sizing:border-box;margin:0;padding:0}
.fx a{color:inherit;text-decoration:none}
.fx .wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.fx .grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.fx .glow{position:fixed;border-radius:50%;filter:blur(120px);opacity:.28;z-index:0;pointer-events:none}
.fx .glow-a{width:520px;height:520px;background:#5b9dff;top:-160px;right:-120px}
.fx .glow-b{width:480px;height:480px;background:#8b6dff;top:600px;left:-200px}
.fx .glow-c{width:420px;height:420px;background:#37e0c8;top:1500px;right:-160px;opacity:.18}
.fx .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);
  background-size:44px 44px;mask-image:radial-gradient(circle at 50% 20%,#000,transparent 75%)}
.fx main{position:relative;z-index:1}
.fx .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;letter-spacing:2px;text-transform:uppercase;
  color:var(--acc);border:1px solid var(--stroke-2);padding:7px 14px;border-radius:100px;background:#5b9dff10;margin-bottom:26px}
.fx .pulse{width:7px;height:7px;border-radius:50%;background:var(--acc3);animation:fpulse 2.2s infinite}
@keyframes fpulse{0%{box-shadow:0 0 0 0 #37e0c880}70%{box-shadow:0 0 0 9px #37e0c800}100%{box-shadow:0 0 0 0 #37e0c800}}
.fx h1{font-size:clamp(38px,6.2vw,68px);line-height:1.04;font-weight:800;letter-spacing:-1.5px}
.fx .sub{font-size:clamp(17px,2.3vw,22px);color:var(--muted);margin-top:22px;max-width:720px}
.fx .sub b{color:var(--text);font-weight:600}
.fx .cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:38px}
.fx .btn{padding:13px 24px;border-radius:12px;font-weight:600;font-size:15px;border:1px solid transparent;transition:.2s;display:inline-flex;align-items:center;gap:9px}
.fx .btn-p{background:var(--grad);color:#0a0c12}
.fx .btn-p:hover{transform:translateY(-2px);box-shadow:0 12px 30px -10px #5b9dff90}
.fx .btn-g{border-color:var(--stroke-2);color:var(--text)}
.fx .btn-g:hover{background:#ffffff08;border-color:var(--acc)}
.fx .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:56px}
.fx .stat{background:var(--card);border:1px solid var(--stroke);border-radius:16px;padding:22px 18px;backdrop-filter:blur(8px)}
.fx .stat .n{font-size:30px;font-weight:800;letter-spacing:-1px}
.fx .stat .l{font-size:12.5px;color:var(--muted);margin-top:4px;letter-spacing:.3px}
@media(max-width:720px){.fx .stats{grid-template-columns:repeat(2,1fr)}}
.fx section{padding:74px 0;border-top:1px solid var(--stroke)}
.fx .sec-head{margin-bottom:44px}
.fx .sec-tag{font-size:12.5px;letter-spacing:2.5px;text-transform:uppercase;color:var(--acc2);font-weight:600}
.fx .sec-title{font-size:clamp(26px,4vw,40px);font-weight:800;letter-spacing:-1px;margin-top:12px}
.fx .sec-lead{color:var(--muted);margin-top:14px;max-width:760px;font-size:16.5px}
.fx .venture{background:linear-gradient(160deg,#141a2e,#0e1220);border:1px solid var(--stroke-2);border-radius:24px;padding:44px;position:relative;overflow:hidden}
.fx .venture::before{content:"";position:absolute;top:-60px;right:-60px;width:260px;height:260px;background:var(--grad);opacity:.16;filter:blur(60px)}
.fx .vhead{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.fx .vlogo{width:56px;height:56px;border-radius:16px;background:var(--grad);display:grid;place-items:center;font-weight:800;color:#0a0c12;font-size:20px}
.fx .venture h3{font-size:26px;font-weight:800;letter-spacing:-.5px}
.fx .vrole{font-size:13px;color:var(--acc3);letter-spacing:.5px;text-transform:uppercase;font-weight:600}
.fx .venture p{color:var(--muted);margin-top:20px;font-size:16.5px;max-width:820px}
.fx .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}
.fx .pillar{background:#0a0c1266;border:1px solid var(--stroke);border-radius:14px;padding:20px}
.fx .pillar h4{font-size:15.5px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:9px}
.fx .pic{width:9px;height:9px;border-radius:3px;display:inline-block;background:var(--acc)}
.fx .pic2{background:var(--acc2)}
.fx .pic3{background:var(--acc3)}
.fx .pillar p{font-size:14px;color:var(--faint);margin-top:0}
@media(max-width:720px){.fx .venture{padding:28px}.fx .pillars{grid-template-columns:1fr}}
.fx .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.fx .card{background:var(--card);border:1px solid var(--stroke);border-radius:18px;padding:28px;backdrop-filter:blur(8px);transition:.2s}
.fx .card:hover{border-color:var(--stroke-2);transform:translateY(-3px)}
.fx .card h3{font-size:19px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:11px}
.fx .badge{width:34px;height:34px;border-radius:10px;background:#5b9dff18;border:1px solid var(--stroke-2);display:grid;place-items:center;font-size:17px}
.fx .card p{color:var(--muted);font-size:14.5px}
.fx .card ul{list-style:none;margin-top:14px;display:flex;flex-wrap:wrap;gap:8px}
.fx .card ul li{font-size:12.5px;color:var(--text);background:#ffffff09;border:1px solid var(--stroke);padding:5px 11px;border-radius:8px}
@media(max-width:720px){.fx .cards{grid-template-columns:1fr}}
.fx .timeline{position:relative;padding-left:28px}
.fx .timeline::before{content:"";position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:linear-gradient(var(--acc),var(--acc2),transparent)}
.fx .tl{position:relative;padding:0 0 34px 8px}
.fx .tl::before{content:"";position:absolute;left:-27px;top:5px;width:13px;height:13px;border-radius:50%;background:var(--fg);border:2px solid var(--acc)}
.fx .tl.now::before{background:var(--acc3);border-color:var(--acc3);box-shadow:0 0 0 4px #37e0c825}
.fx .yr{font-size:12.5px;color:var(--acc);font-weight:600;letter-spacing:.5px}
.fx .tl h4{font-size:17.5px;font-weight:700;margin-top:3px}
.fx .org{font-size:13.5px;color:var(--faint);margin-top:1px}
.fx .tl p{font-size:14.5px;color:var(--muted);margin-top:9px;max-width:760px}
.fx .skillcols{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.fx .skillcol h4{font-size:13px;text-transform:uppercase;letter-spacing:1.5px;color:var(--acc2);margin-bottom:14px}
.fx .tag{display:inline-block;font-size:13px;color:var(--text);background:#ffffff08;border:1px solid var(--stroke);padding:6px 12px;border-radius:8px;margin:0 6px 8px 0}
@media(max-width:720px){.fx .skillcols{grid-template-columns:1fr 1fr}}
.fx .contact-box{text-align:center;background:linear-gradient(160deg,#141a2e,#0e1220);border:1px solid var(--stroke-2);border-radius:24px;padding:56px 28px;position:relative;overflow:hidden}
.fx .contact-box::before{content:"";position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);width:400px;height:280px;background:var(--grad);opacity:.14;filter:blur(70px);z-index:0}
.fx .contact-box>*{position:relative;z-index:1}
.fx .contact-box h2{font-size:clamp(26px,4vw,40px);font-weight:800;letter-spacing:-1px}
.fx .contact-box p{color:var(--muted);margin:16px auto 30px;max-width:560px}
.fx .reveal{opacity:0;transform:translateY(24px);transition:.7s cubic-bezier(.2,.7,.2,1)}
.fx .reveal.in{opacity:1;transform:none}
.fx header{padding:90px 0 70px}
`

export default function FounderPage() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in") }),
      { threshold: 0.12 }
    )
    document.querySelectorAll(".fx .reveal").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="fx">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="grid-bg" />
      <div className="glow glow-a" /><div className="glow glow-b" /><div className="glow glow-c" />

      <main>
        {/* Hero */}
        <header>
          <div className="wrap">
            <span className="eyebrow"><span className="pulse" /> Founder · SAP Solution Architect · Digital Manufacturing</span>
            <h1>Building the <span className="grad-text">digital backbone</span><br />of modern manufacturing.</h1>
            <p className="sub">
              <b>Sunay S.</b> is the founder of <b>DES (Digital Enterprise Solutions)</b> and an SAP Solution Architect
              with <b>20+ years</b> turning factory floors into connected, data-driven systems. From SAP S/4HANA and MES
              to IoT, RFID and AI data lakes, he designs the layer where enterprise software meets the machine.
            </p>
            <div className="cta-row">
              <a className="btn btn-p" href="#contact">Get in touch →</a>
              <a className="btn btn-g" href="#des">Explore DES</a>
            </div>
            <div className="stats">
              <div className="stat"><div className="n grad-text">20+</div><div className="l">Years in enterprise IT</div></div>
              <div className="stat"><div className="n grad-text">20+</div><div className="l">Factories consulted</div></div>
              <div className="stat"><div className="n grad-text">3</div><div className="l">Industries: Glass · Biotech · Oil</div></div>
              <div className="stat"><div className="n grad-text">15+</div><div className="l">Major SAP / MES rollouts</div></div>
            </div>
          </div>
        </header>

        {/* DES Venture */}
        <section id="des">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">The Venture</div>
              <div className="sec-title">DES — Digital Enterprise Solutions</div>
              <p className="sec-lead">The ecosystem Sunay founded and leads — bringing two decades of manufacturing, SAP and digital-transformation expertise into one platform for enterprises modernising their operations.</p>
            </div>
            <div className="venture">
              <div className="vhead">
                <div className="vlogo">DES</div>
                <div><h3>Digital Enterprise Solutions</h3><div className="vrole">Founder &amp; Solution Architect</div></div>
              </div>
              <p>DES is a services-plus-product ecosystem that connects the factory floor to the enterprise: SAP S/4HANA logistics, Manufacturing Execution Systems (MES), IoT devices and data platforms, unified into a single digital thread. Built on 20+ years of hands-on implementation, DES helps manufacturers plan smarter, capture real-time production and quality data, and turn that data into intelligence.</p>
              <div className="pillars">
                <div className="pillar"><h4><span className="pic" />Connect</h4><p>Integrate SAP (PP, QM, MM, EWM) with MES, RFID, inspection and automation devices via web services, IDoc &amp; RFC.</p></div>
                <div className="pillar"><h4><span className="pic pic2" />Transform</h4><p>Design S/4HANA-ready manufacturing processes on SAP best practices — from greenfield rollouts to migrations.</p></div>
                <div className="pillar"><h4><span className="pic pic3" />Intelligence</h4><p>Collect shopfloor data into data lakes and BI/AI platforms for real-time visibility and smarter decisions.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* Expertise */}
        <section id="expertise">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">What I Do</div>
              <div className="sec-title">Core expertise</div>
              <p className="sec-lead">The disciplines Sunay combines to architect and deliver digital manufacturing at enterprise scale.</p>
            </div>
            <div className="cards">
              <div className="card"><h3><span className="badge">⚙️</span>SAP Logistics &amp; S/4HANA</h3><p>Deep functional ownership of SAP production and logistics — design, customise, configure, test, and close gaps with best-practice solutions.</p><ul><li>PP</li><li>QM</li><li>MM</li><li>eWM</li><li>SD</li><li>PM</li><li>S/4HANA Migration</li><li>Fiori</li></ul></div>
              <div className="card"><h3><span className="badge">🏭</span>Digital Manufacturing &amp; MES</h3><p>Setup and execution of shopfloor MES systems, real-time production tracking and manufacturing analytics.</p><ul><li>MES / Shop Floor</li><li>SAP ME/MII</li><li>Production Confirmation</li><li>Quality Capture</li></ul></div>
              <div className="card"><h3><span className="badge">🔗</span>Systems Integration</h3><p>Connecting factory automation and external devices to SAP for real-time visibility across the plant.</p><ul><li>RFID</li><li>Barcode / Scanning</li><li>Web Services (XML/WSDL)</li><li>IDoc</li><li>RFC</li></ul></div>
              <div className="card"><h3><span className="badge">📊</span>Data, IoT &amp; Transformation</h3><p>Preparing software infrastructure for digital transformation — Big Data, IoT and AI data lakes fed from the shop floor.</p><ul><li>Data Lake</li><li>IoT Platforms</li><li>Big Data</li><li>Business Intelligence</li></ul></div>
              <div className="card"><h3><span className="badge">💻</span>Custom Software &amp; ERP</h3><p>Two decades building custom enterprise applications on Oracle and SAP toolchains, tailored to real business processes.</p><ul><li>ABAP</li><li>PL/SQL</li><li>Oracle Forms/Reports</li><li>Web Apps</li></ul></div>
              <div className="card"><h3><span className="badge">🧭</span>Architecture &amp; Delivery</h3><p>Aligning IT architecture with manufacturing strategy — leading transformation programs, rollouts and multi-plant deployments.</p><ul><li>Solution Architecture</li><li>PMP</li><li>ITIL</li><li>Rollouts</li></ul></div>
            </div>
          </div>
        </section>

        {/* Journey */}
        <section id="journey">
          <div className="wrap reveal">
            <div className="sec-head">
              <div className="sec-tag">Track Record</div>
              <div className="sec-title">The journey</div>
              <p className="sec-lead">Two decades of enterprise software — developing and deploying since 2004, across glass, biotech and industrial-oil manufacturing.</p>
            </div>
            <div className="timeline">
              <div className="tl now"><div className="yr">2026 — Present</div><h4>Founder, DES · Senior SAP Consulting</h4><div className="org">Digital Enterprise Solutions · Freelance</div><p>Building the DES ecosystem in parallel with part-time senior SAP support — bringing 20+ years of manufacturing expertise into one platform.</p></div>
              <div className="tl"><div className="yr">2025 — 2026</div><h4>SAP &amp; MES Integration Consultant</h4><div className="org">Automotive Industrial-Oil Manufacturer · Freelance</div><p>Supported third-party custom MES and S/4HANA integrations across manufacturing components.</p></div>
              <div className="tl"><div className="yr">2023 — 2025</div><h4>S/4HANA Logistics Lead — Biotech</h4><div className="org">Legend Biotech</div><p>Led S/4HANA logistics modules and external interfaces (MES, Lab System, Data Lake); contributed to greenfield S/4 rollout of a new biotech facility across PP, QM, MM and EWM.</p></div>
              <div className="tl"><div className="yr">2020 — 2023</div><h4>SAP Logistics Consultant — S/4HANA</h4><div className="org">Trakya Glass Bulgaria &amp; Şişecam · Freelance</div><p>Integration between native enterprise software and SAP, redesigned SAP-PP flows and prepared infrastructure for S/4HANA migration.</p></div>
              <div className="tl"><div className="yr">2004 — 2020</div><h4>IT / SAP Specialist &amp; Solution Architect</h4><div className="org">Şişecam Glass Company</div><p>Consulted 20+ glass factories (flat, automotive, glassware) — leading ERP &amp; manufacturing implementations, MES, RFID integration, digital-transformation projects and multi-plant rollouts, from Oracle to SAP ECC to S/4HANA.</p></div>
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
              <div className="skillcol"><h4>SAP</h4>{["PP","QM","MM","eWM","SD","PM","S/4HANA","ME/MII","Fiori","ABAP"].map(t => <span key={t} className="tag">{t}</span>)}</div>
              <div className="skillcol"><h4>Programming</h4>{["PL/SQL","ABAP","C++","JavaScript","PHP","VB","jQuery","DB Management"].map(t => <span key={t} className="tag">{t}</span>)}</div>
              <div className="skillcol"><h4>Certifications</h4>{["PMP","ITIL","SAP ERP / ABAP","Oracle SQL / PL-SQL"].map(t => <span key={t} className="tag">{t}</span>)}</div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact">
          <div className="wrap reveal">
            <div className="contact-box">
              <h2>{"Let's build something "}<span className="grad-text">digital</span>{"."}</h2>
              <p>Sunay is open to consulting, partnerships and collaboration around SAP, digital manufacturing and DES. Whether you are modernising a factory or scaling an idea — reach out.</p>
              <div className="cta-row" style={{ justifyContent: "center" }}>
                <a className="btn btn-p" href="mailto:info@dessystems.io">✉ info@dessystems.io</a>
                <a className="btn btn-g" href="https://linkedin.com/in/sunay-sabri-837603ba" target="_blank" rel="noopener noreferrer">in · LinkedIn</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
