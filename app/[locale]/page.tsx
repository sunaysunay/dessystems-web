import HeroPanels from "@/components/hero-panels"
import { Link } from "@/src/i18n/routing"
import { ArrowRight, CheckCircle } from "lucide-react"
import { useTranslations } from "next-intl"

// ── Inline mini-dashboard ─────────────────────────────────────────────────────
function DashMockup() {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--bg4)", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div className="text-[13px] font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>DES <span style={{ color: "var(--accent2)" }}>PLATFORM</span></div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>Dashboard · This Month</div>
        </div>
        <div className="flex gap-1.5">
          {["#ff5f57","#3b82f6","#10b981"].map(c => <span key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }} />)}
        </div>
      </div>
      <div className="grid grid-cols-4" style={{ gap: "1px", background: "var(--border)" }}>
        {[["Total Leads","1,250","↑ 18.5%"],["Active Clients","320","↑ 12.2%"],["Open Projects","98","↑ 15.7%"],["Revenue YTD","€2.4M","↑ 21.9%"]].map(([l,v,d]) => (
          <div key={l} className="px-3 py-3" style={{ background: "var(--bg3)" }}>
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{l}</div>
            <div className="text-[18px] font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{v}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--green)" }}>{d}</div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3">
        <div className="text-[10px] mb-2" style={{ color: "var(--text3)" }}>Leads over time</div>
        <div className="flex items-end gap-1 h-12">
          {[35,45,40,60,55,75,100].map((h,i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: "var(--accent)", opacity: i === 6 ? 1 : 0.25 + i*0.07 }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {[["⚙","Automation"],["📊","Analytics"],["🔗","Integrations"]].map(([ico,name]) => (
          <div key={name} className="rounded-lg px-3 py-2.5 text-[11px]" style={{ background: "var(--bg4)", border: "1px solid var(--border)" }}>
            <div className="text-base mb-1" style={{ color: "var(--accent2)" }}>{ico}</div>
            <div style={{ color: "var(--text2)" }}>{name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SAP modules badge ─────────────────────────────────────────────────────────
const SAP_MODS = ["SAP MM","SAP PP","SAP QM","SAP WM/EWM","SAP PM","SAP SD","SAP TM"]
const TECH_CAPS = [
  { ico:"🏭", name:"MES Integrations",   desc:"Seamless integration between MES and ERP for real-time production visibility." },
  { ico:"🔌", name:"APIs",               desc:"RESTful APIs and web services for smooth system connectivity." },
  { ico:"🔄", name:"EDI",                desc:"Electronic Data Interchange for B2B communication and supply chain integration." },
  { ico:"📄", name:"IDoc",               desc:"IDoc development and management for robust SAP integrations." },
  { ico:"🌐", name:"External Systems",   desc:"Integrate with third-party and legacy systems effortlessly." },
  { ico:"🛠️", name:"Custom Platforms",   desc:"Custom web applications and platforms tailored to your business needs." },
]
const INDUSTRIES = [
  { ico:"🚗", name:"Automotive",          desc:"Manufacturing and supply chain solutions for the automotive sector." },
  { ico:"🏭", name:"Manufacturing",       desc:"Production planning and shop floor integration." },
  { ico:"📦", name:"Logistics & Supply Chain", desc:"End-to-end visibility and process optimisation." },
  { ico:"🛒", name:"Retail & Distribution", desc:"Inventory, order and distribution management." },
  { ico:"⚙️", name:"Engineering",         desc:"Project-driven and engineered solutions." },
  { ico:"➕", name:"More Industries",      desc:"Solutions tailored to your specific business needs." },
]
const INSIGHTS = [
  { tag:"ERP",        ico:"📊", date:"May 10, 2024", title:"How ERP Drives Operational Excellence",    desc:"Explore how modern ERP systems help businesses improve efficiency and agility.", color:"var(--accent)" },
  { tag:"Automation", ico:"🤖", date:"May 6, 2024",  title:"The Power of Business Automation",         desc:"Automation is no longer an option. It's a necessity for growth and scalability.", color:"#10b981" },
  { tag:"Integration",ico:"🔗", date:"May 2, 2024",  title:"MES & ERP Integration Best Practices",     desc:"Key strategies for successful MES and ERP integration in manufacturing environments.", color:"#7c3aed" },
]
const PLATFORM_FEATURES = [
  { ico:"👥", name:"CRM & Leads",         desc:"Capture, manage and convert leads efficiently." },
  { ico:"🌐", name:"Website Management",  desc:"Manage multiple websites and listings seamlessly." },
  { ico:"⚡", name:"Automation",          desc:"Automate workflows and save valuable time." },
  { ico:"📈", name:"Analytics",           desc:"Real-time insights for smarter decisions." },
  { ico:"🏢", name:"Multi-Tenant",        desc:"One platform for multiple businesses or brands." },
  { ico:"🔒", name:"Secure & Scalable",   desc:"Enterprise-grade security and scalable infrastructure." },
]

export default function HomePage() {
  const t  = useTranslations("Home")
  const tf = useTranslations("Footer")

  return (
    <>
      {/* ── Hero ── */}
      <HeroPanels />

      {/* ── Platform section ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>Our own product</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
              Business Operating Platform
            </h2>
            <p className="text-[15px] leading-relaxed mb-8" style={{ color: "var(--text2)" }}>
              DES Platform is our proprietary solution to manage leads, customers, websites, operations, analytics and automation — all in one ecosystem.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {PLATFORM_FEATURES.map(f => (
                <div key={f.name} className="rounded-lg p-4 transition-colors"
                  style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                  <div className="text-lg mb-2" style={{ color: "var(--accent2)" }}>{f.ico}</div>
                  <div className="text-[13px] font-medium mb-1">{f.name}</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <Link href="/platform"
              className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg transition-all"
              style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
              Explore DES Platform <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div><DashMockup /></div>
        </div>
      </section>

      {/* ── Core expertise ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg3)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>What we do</div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>Our Core Expertise</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl overflow-hidden" style={{ gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}>
            {[
              { ico:"🏭", name:"Enterprise Systems", desc:"End-to-end enterprise solutions designed to optimise your operations and business processes." },
              { ico:"⚙️", name:"ERP",                desc:"Implementation, support and optimisation for modern ERP systems across all major platforms." },
              { ico:"🤖", name:"Automation",         desc:"Process automation to improve productivity, reduce costs and eliminate manual bottlenecks." },
              { ico:"🔗", name:"Integration",        desc:"Seamless integration across systems, data sources and processes — from shop floor to top floor." },
            ].map(c => (
              <div key={c.name} className="p-7 transition-colors" style={{ background: "var(--bg3)" }}>
                <div className="text-2xl mb-4" style={{ color: "var(--accent2)" }}>{c.ico}</div>
                <div className="text-[16px] font-semibold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>{c.name}</div>
                <div className="text-[13px] leading-relaxed" style={{ color: "var(--text3)" }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ERP Consulting ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg2)" }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>ERP Consulting Services</div>
            <h2 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
              SAP & ERP expertise that delivers results
            </h2>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--text2)" }}>
              We help businesses implement, optimise and support their ERP systems. Our expertise ensures better processes, accurate data and measurable results.
            </p>
            <ul className="grid grid-cols-2 gap-3 mb-8">
              {["Process Analysis & Design","Training & Support","ERP Implementation","Data Migration","System Optimisation","Change Management"].map(i => (
                <li key={i} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text2)" }}>
                  <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--green)" }} /> {i}
                </li>
              ))}
            </ul>
            <Link href="/services#erp"
              className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg text-white transition-colors"
              style={{ background: "var(--accent)" }}>
              View ERP Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-xl p-7" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>SAP Logistics Expertise</h3>
            <p className="text-[13px] mb-5 leading-relaxed" style={{ color: "var(--text2)" }}>
              Deep expertise in SAP S/4HANA Logistics modules, from planning to execution.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {SAP_MODS.map(m => (
                <span key={m} className="text-[12px] font-medium px-3 py-1 rounded"
                  style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", color: "var(--accent2)" }}>
                  {m}
                </span>
              ))}
            </div>
            <p className="text-[12px] pt-4 leading-relaxed" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
              From planning to execution, we deliver end-to-end logistics solutions with SAP — greenfield, brownfield, and system optimisation engagements.
            </p>
          </div>
        </div>
      </section>

      {/* ── Technical capabilities ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>Technical capabilities</div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>Built for complex system landscapes</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH_CAPS.map(c => (
              <div key={c.name} className="rounded-xl p-6 text-center transition-all"
                style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="text-2xl mb-3" style={{ color: "var(--accent2)" }}>{c.ico}</div>
                <div className="text-[14px] font-medium mb-2">{c.name}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Freelance ── */}
      <section className="py-20 px-[4%] relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0a1628 0%,#0d1e3a 50%,#0a1628 100%)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(37,99,235,0.08) 0%, transparent 60%)" }} />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>Freelance Opportunities</div>
            <h2 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
              Freelance ERP & Automation Consultant
            </h2>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--text2)" }}>
              Available for freelance projects worldwide. Let's work together to deliver value to your business — remote or on-site, short or long-term.
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {["Remote / On-site Engagements","Long-term or Short-term Projects","Flexible Engagement Models"].map(i => (
                <li key={i} className="flex items-center gap-3 text-[14px]" style={{ color: "var(--text2)" }}>
                  <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--green)" }} /> {i}
                </li>
              ))}
            </ul>
            <Link href="/contact"
              className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg text-white"
              style={{ background: "var(--accent)" }}>
              Work With Me <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { val:"10+", label:"SAP Expertise",  sub:"Years of Experience" },
              { val:"50+", label:"Projects",        sub:"Successful Projects" },
              { val:"Global", label:"Availability", sub:"Remote Worldwide" },
              { val:"Flex",  label:"Engagement",    sub:"Full-time / Part-time" },
            ].map(s => (
              <div key={s.label}>
                <div className="text-[32px] font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{s.val}</div>
                <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "var(--text3)" }}>{s.label}</div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg2)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>Industries we serve</div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>Sector expertise across verticals</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INDUSTRIES.map(i => (
              <div key={i.name} className="rounded-xl p-6 transition-all"
                style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="text-2xl mb-3" style={{ color: "var(--accent2)" }}>{i.ico}</div>
                <div className="text-[13px] font-medium mb-2">{i.name}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{i.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Insights ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-2" style={{ color: "var(--accent2)" }}>Latest Insights</div>
              <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>News & articles</h2>
            </div>
            <Link href="/insights" className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--accent2)" }}>
              View All Insights <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {INSIGHTS.map(n => (
              <div key={n.title} className="rounded-xl overflow-hidden transition-all cursor-pointer group"
                style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="relative h-36 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#0d1e3a,#162035)" }}>
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded"
                    style={{ background: n.color }}>{n.tag}</span>
                  <span className="text-4xl">{n.ico}</span>
                </div>
                <div className="p-5">
                  <div className="text-[11px] mb-2" style={{ color: "var(--text3)" }}>{n.date}</div>
                  <div className="text-[14px] font-medium mb-2 leading-snug group-hover:text-blue-400 transition-colors">{n.title}</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{n.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-[4%]" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>Let's Discuss Your Project</h2>
            <p className="text-[14px]" style={{ color: "var(--text2)" }}>Available for remote & on-site engagements worldwide.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/contact"
              className="flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-lg text-white"
              style={{ background: "var(--accent)" }}>
              Get in Touch <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/solutions"
              className="flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
              Our Solutions
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
