import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Solutions — DES Systems",
  description: "Enterprise ERP consulting, MES integration, automation and custom platform solutions.",
}

const solutions = [
  {
    id: "erp",
    icon: "⚙️",
    title: "ERP Consulting",
    subtitle: "SAP S/4HANA · Implementation · Optimisation",
    accent: "#2563eb",
    desc: "We help businesses implement, optimise and support their ERP systems. From greenfield S/4HANA implementations to brownfield conversions and ongoing support.",
    bullets: ["Process Analysis & Design","ERP Implementation","System Optimisation","Data Migration","Training & Support","Change Management"],
    modules: ["SAP MM","SAP PP","SAP QM","SAP WM/EWM","SAP PM","SAP SD","SAP TM"],
  },
  {
    id: "mes",
    icon: "🏭",
    title: "MES Integration",
    subtitle: "Shop Floor · ERP Connectivity · Real-time Data",
    accent: "#10b981",
    desc: "Seamless integration between Manufacturing Execution Systems and ERP for real-time production visibility, from shop floor to top floor.",
    bullets: ["MES–ERP Interface Design","Production Order Management","Real-time Data Synchronisation","IDoc & API Development","Monitoring & Alerting","Performance Optimisation"],
    modules: ["SAP ME","SAP MII","Siemens Opcenter","IDoc","BAPI","REST APIs"],
  },
  {
    id: "automation",
    icon: "🤖",
    title: "Automation",
    subtitle: "Workflow Design · Process Automation · Digital Operations",
    accent: "#7c3aed",
    desc: "Eliminate manual bottlenecks, reduce costs and improve productivity through intelligent process automation across your enterprise systems.",
    bullets: ["Workflow Analysis & Design","SAP Intelligent Automation","RPA Integration","KPI Dashboards","Monitoring Systems","Custom Automation Scripts"],
    modules: ["SAP BTP","Integration Suite","Python","Power Automate","APIs","Webhooks"],
  },
  {
    id: "integration",
    icon: "🔗",
    title: "Integration",
    subtitle: "API Development · EDI · System Connectivity",
    accent: "#f59e0b",
    desc: "Connect your enterprise systems, data sources and business partners. From SAP middleware to custom API development and EDI solutions.",
    bullets: ["API Design & Development","EDI B2B Integration","SAP PI/PO → Integration Suite","IDoc Processing","External System Connectors","Data Synchronisation"],
    modules: ["SAP PI/PO","Integration Suite","EDI","REST","SOAP","BTP"],
  },
]

export default function SolutionsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: "80px" }}>
      <div className="max-w-7xl mx-auto px-[4%] py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>Our Solutions</div>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Syne',sans-serif" }}>
            Enterprise Solutions.<br />Real Business Impact.
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
            End-to-end enterprise solutions across ERP, MES, automation and integration — built to drive measurable results.
          </p>
        </div>

        {/* Solutions */}
        <div className="space-y-8">
          {solutions.map((s, i) => (
            <div key={s.id} id={s.id}
              className="rounded-2xl overflow-hidden grid lg:grid-cols-[1fr_400px] gap-0"
              style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
              <div className="p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{s.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{s.title}</h2>
                    <div className="text-[12px] mt-0.5" style={{ color: "var(--text3)" }}>{s.subtitle}</div>
                  </div>
                </div>
                <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--text2)" }}>{s.desc}</p>
                <ul className="grid grid-cols-2 gap-2 mb-6">
                  {s.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text2)" }}>
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--green)" }} /> {b}
                    </li>
                  ))}
                </ul>
                <Link href={`/contact?topic=${s.id}`}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-lg text-white"
                  style={{ background: s.accent }}>
                  Discuss this Solution <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-8 flex flex-col justify-center" style={{ background: "var(--bg3)", borderLeft: "1px solid var(--border)" }}>
                <div className="text-[11px] uppercase tracking-wider font-semibold mb-4" style={{ color: "var(--text3)" }}>Technologies & Modules</div>
                <div className="flex flex-wrap gap-2">
                  {s.modules.map(m => (
                    <span key={m} className="text-[12px] font-medium px-3 py-1 rounded"
                      style={{ background: `${s.accent}15`, border: `1px solid ${s.accent}30`, color: s.accent }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Also: BOP platform */}
        <div className="mt-8 rounded-2xl p-10 text-center"
          style={{ background: "linear-gradient(135deg,#080c14,#0d1e3a)", border: "1px solid var(--border2)" }}>
          <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>Our own product</div>
          <h2 className="text-2xl font-bold mb-3 text-white" style={{ fontFamily: "'Syne',sans-serif" }}>Business Operating Platform</h2>
          <p className="text-[14px] mb-6 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            DES Platform connects leads, customers, websites, analytics and operations in one ecosystem — powering all DES Group businesses.
          </p>
          <Link href="/platform"
            className="inline-flex items-center gap-2 text-[14px] font-semibold px-6 py-3 rounded-lg text-white"
            style={{ background: "var(--accent)" }}>
            Explore DES Platform <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
