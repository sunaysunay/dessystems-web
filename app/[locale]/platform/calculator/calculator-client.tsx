"use client"

import { useEffect } from "react"

/* ─────────────────────────────────────────────────────────────────────────
   DES BOP V2 — Savings & Profit Calculator.
   Interactive ROI tool. Scoped under `.bopv2`. Site Nav + Footer come from
   the locale layout. Sliders + tool chips drive a live cost model.
   ───────────────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;450;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.bopv2{
  --ink:#0B0E11;--ink-2:#12171C;--panel:#161C22;--line:#232C34;--line-2:#2E3941;
  --fog:#8A99A6;--fog-2:#5C6B76;--paper:#EDEFF1;--paper-dim:#C7CFD5;
  --plate:#F5C518;--plate-deep:#E0AE00;--live:#3DDC84;--alert:#FF5D5D;
  --radius:4px;--mono:'IBM Plex Mono',monospace;--disp:'Space Grotesk',sans-serif;--body:'Inter',sans-serif;
  background:var(--ink);color:var(--paper);font-family:var(--body);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;
}
.bopv2 *{margin:0;padding:0;box-sizing:border-box}
.bopv2 ::selection{background:var(--plate);color:#000}
.bopv2 a{color:inherit;text-decoration:none}
.bopv2 .wrap{max-width:1080px;margin:0 auto;padding:96px 24px 60px}
.bopv2 .back{font-family:var(--mono);font-size:11px;letter-spacing:.05em;color:var(--fog);display:inline-flex;align-items:center;gap:7px;margin-bottom:24px}
.bopv2 .back:hover{color:var(--plate)}
.bopv2 .head{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.bopv2 .mark{width:34px;height:24px;border-radius:3px;background:var(--plate);color:#000;font-family:var(--mono);font-weight:600;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1.5px #000}
.bopv2 .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--fog-2)}
.bopv2 h1{font-family:var(--disp);font-weight:700;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;line-height:1.02;margin:10px 0 8px}
.bopv2 .sub{color:var(--fog);max-width:60ch;font-size:15px}
.bopv2 .grid{display:grid;grid-template-columns:1fr 1.15fr;gap:24px;margin-top:34px}
@media(max-width:880px){.bopv2 .grid{grid-template-columns:1fr}}

.bopv2 .card{background:var(--ink-2);border:1px solid var(--line);border-radius:10px;padding:22px}
.bopv2 .card h2{font-family:var(--disp);font-weight:600;font-size:16px;margin-bottom:4px}
.bopv2 .card .hint{font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;color:var(--fog-2);margin-bottom:18px}

.bopv2 .field{margin-bottom:16px}
.bopv2 .field label{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:var(--paper-dim);margin-bottom:7px}
.bopv2 .field label .val{font-family:var(--mono);font-size:13px;color:var(--plate);font-weight:500}
.bopv2 input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:var(--line-2);outline:none}
.bopv2 input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--plate);cursor:pointer;box-shadow:0 0 0 3px rgba(245,197,24,.15)}
.bopv2 input[type=range]::-moz-range-thumb{width:16px;height:16px;border:none;border-radius:50%;background:var(--plate);cursor:pointer}
.bopv2 .field .tick{display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;color:var(--fog-2);margin-top:5px}

.bopv2 .divider{height:1px;background:var(--line);margin:20px 0}
.bopv2 .toggle-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}
.bopv2 .chip{font-family:var(--mono);font-size:11px;padding:6px 10px;border:1px solid var(--line-2);border-radius:var(--radius);color:var(--fog);cursor:pointer;user-select:none;transition:.15s;display:flex;align-items:center;gap:6px}
.bopv2 .chip .cost{color:var(--fog-2)}
.bopv2 .chip.on{border-color:var(--plate);color:var(--paper);background:rgba(245,197,24,.06)}
.bopv2 .chip.on .cost{color:var(--plate)}
.bopv2 .chip .box{width:12px;height:12px;border:1px solid var(--line-2);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:9px}
.bopv2 .chip.on .box{border-color:var(--plate);color:var(--plate)}

.bopv2 .result{position:sticky;top:90px}
.bopv2 .headline{background:linear-gradient(160deg,var(--panel),var(--ink-2));border:1px solid var(--line-2);border-radius:10px;padding:24px;position:relative;overflow:hidden}
.bopv2 .headline::after{content:"";position:absolute;inset:0;background:radial-gradient(500px 140px at 85% -20%,rgba(245,197,24,.13),transparent);pointer-events:none}
.bopv2 .headline .lab{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--fog-2);position:relative}
.bopv2 .big-num{font-family:var(--disp);font-weight:700;font-size:clamp(34px,6vw,52px);letter-spacing:-.03em;line-height:1;margin:8px 0 2px;position:relative;color:var(--paper)}
.bopv2 .big-num .cur{color:var(--plate);font-size:.6em;vertical-align:top;margin-right:4px}
.bopv2 .per{font-family:var(--mono);font-size:12px;color:var(--fog);position:relative}
.bopv2 .head-split{display:flex;gap:26px;margin-top:20px;padding-top:18px;border-top:1px solid var(--line);position:relative}
.bopv2 .head-split .s .n{font-family:var(--disp);font-weight:600;font-size:22px;color:var(--paper)}
.bopv2 .head-split .s .l{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--fog-2);margin-top:3px}
.bopv2 .head-split .s .n.green{color:var(--live)}

.bopv2 .breakdown{margin-top:18px;background:var(--ink-2);border:1px solid var(--line);border-radius:10px;padding:20px}
.bopv2 .breakdown h3{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--fog-2);margin-bottom:14px}
.bopv2 .brow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line);font-size:13.5px}
.bopv2 .brow:first-of-type{border-top:none}
.bopv2 .brow .k{color:var(--paper-dim);display:flex;align-items:center;gap:9px}
.bopv2 .brow .k .dot{width:8px;height:8px;border-radius:2px}
.bopv2 .brow .v{font-family:var(--mono);font-size:13.5px;color:var(--paper)}
.bopv2 .brow.sub .k{color:var(--fog);font-size:12.5px;padding-left:17px}
.bopv2 .brow.total{border-top:1.5px solid var(--line-2);margin-top:4px}
.bopv2 .brow.total .k{color:var(--paper);font-weight:600}
.bopv2 .brow.total .v{color:var(--plate);font-weight:600;font-size:15px}
.bopv2 .brow.cost .v{color:var(--alert)}

.bopv2 .profit-band{margin-top:18px;border:1px solid var(--line-2);border-radius:10px;padding:20px;background:var(--ink-2)}
.bopv2 .profit-band h3{font-family:var(--disp);font-weight:600;font-size:15px;margin-bottom:3px}
.bopv2 .profit-band .note{font-size:12.5px;color:var(--fog);margin-bottom:16px}
.bopv2 .pbar-wrap{margin:14px 0}
.bopv2 .pbar-lab{display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--fog);margin-bottom:6px}
.bopv2 .pbar{height:26px;border-radius:5px;background:var(--line);overflow:hidden;display:flex;position:relative}
.bopv2 .pbar .base{background:var(--fog-2);height:100%;display:flex;align-items:center;padding-left:10px;font-family:var(--mono);font-size:11px;color:#000;font-weight:500;transition:width .6s}
.bopv2 .pbar .lift{background:linear-gradient(90deg,var(--plate-deep),var(--plate));height:100%;display:flex;align-items:center;padding-left:8px;font-family:var(--mono);font-size:11px;color:#000;font-weight:600;transition:width .6s}
.bopv2 .uplift-tag{display:inline-flex;align-items:center;gap:7px;margin-top:6px;font-family:var(--mono);font-size:12px;color:var(--live);border:1px solid rgba(61,220,132,.3);border-radius:var(--radius);padding:7px 11px;background:rgba(61,220,132,.05)}
.bopv2 .roi{margin-top:14px;display:flex;align-items:baseline;gap:9px;font-size:13px;color:var(--fog)}
.bopv2 .roi b{font-family:var(--disp);font-size:20px;color:var(--plate);font-weight:600}

.bopv2 .cta-row{margin-top:22px;display:flex;gap:12px;flex-wrap:wrap}
.bopv2 .btn{font-family:var(--mono);font-size:13px;letter-spacing:.03em;padding:13px 22px;border-radius:var(--radius);transition:.18s;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:9px}
.bopv2 .btn-primary{background:var(--plate);color:#000;font-weight:600;box-shadow:inset 0 0 0 1.5px #000}
.bopv2 .btn-primary:hover{background:var(--plate-deep);transform:translateY(-1px)}
.bopv2 .btn-ghost{border:1px solid var(--line-2);color:var(--paper)}
.bopv2 .btn-ghost:hover{border-color:var(--fog)}

.bopv2 .foot-note{margin-top:26px;font-family:var(--mono);font-size:11px;color:var(--fog-2);line-height:1.7;max-width:70ch}
.bopv2 .foot-note b{color:var(--fog)}

@media(prefers-reduced-motion:reduce){.bopv2 *{transition:none!important}}
`

type Str = {
  back: string; eyebrow: string; h1: string; sub: string
  card1H2: string; card1Hint: string
  fUnits: string; fPrice: string; fGm: string; fNm: string
  card2H2: string; card2Hint: string
  fRate: string; fDays: string; fExtra: string; days15: string
  resLab: string; per: string; hsNet: string; hsTotal: string
  bdH3: string; bTools: string; bLabour: string; bCarry: string; bBop: string; bNet: string; bGrowth: string; bTotmo: string
  pbH3: string; pbNote: string; pbBase: string; roiPre: string; roiPost: string
  ctaDemo: string; ctaPlatform: string; footNote: string
  tools: string[]; hours: (n: number) => string; uplift: (a: number, b: number) => string
}

const STR: Record<string, Str> = {
  en: {
    back: "← Back to the platform", eyebrow: "BOP V2 · dealer economics",
    h1: "What one platform is worth to your lot.",
    sub: "Drag the sliders to your dealership. The model separates hard cash saved from margin gained — and shows why, at thin dealer margins, the profit percentage moves more than you'd expect.",
    card1H2: "Your dealership", card1Hint: "Set your real numbers",
    fUnits: "Cars sold per month", fPrice: "Average sale price", fGm: "Gross margin per car", fNm: "Net margin (for profit-% view)",
    card2H2: "Tools BOP replaces", card2Hint: "Toggle what you pay for today · monthly €",
    fRate: "Loaded staff cost / hour", fDays: "Days-on-lot reduced by AI", fExtra: "Extra cars/mo from freed time", days15: "15 days",
    resLab: "Net benefit after BOP subscription", per: "per month &nbsp;·&nbsp; hard cash, before growth",
    hsNet: "Net saving / year", hsTotal: "With extra units / year",
    bdH3: "Monthly breakdown", bTools: "Tool subscriptions replaced", bLabour: "Labour reclaimed", bCarry: "Carrying cost avoided",
    bBop: "DES BOP V2 subscription", bNet: "Net hard saving", bGrowth: "+ Incremental gross (extra units)", bTotmo: "Total benefit / month",
    pbH3: "Effect on annual net profit", pbNote: "Because dealer margins are thin, the same euros land as a big percentage swing.", pbBase: "Baseline net profit",
    roiPre: "Every € 1 spent on BOP returns", roiPost: "in hard benefit.",
    ctaDemo: "Book a demo →", ctaPlatform: "See the platform",
    footNote: "<b>Method.</b> Hard benefit = replaced tool subscriptions + labour hours reclaimed (AI spec import, listing copy, translation, photo cleanup, publishing, lead replies, BTW prep) valued at your loaded rate + floorplan carrying cost avoided from faster turn, minus the € 349/mo BOP subscription. Growth = incremental units × gross-per-car (softer upside). Marketplace listing fees (Marktplaats, Mobile.de, AutoScout24) are <b>not</b> counted as savings — those channels continue regardless. Benchmarks: dealers average ~6.8 software integrations per sale and thin ~2–3% net margins, so a modest absolute saving is a large share of profit. All figures are estimates for planning — override every input with your own.",
    tools: ["DMS / inventory", "CRM / leads", "Invoicing + boekhouding add-ons", "Photo / background tool", "Multi-channel uploader", "Separate AI writing", "Website feed sync"],
    hours: (n) => "· " + n + " h/mo", uplift: (a, b) => `Net profit up +${a}% (hard) · +${b}% with growth`,
  },
  nl: {
    back: "← Terug naar het platform", eyebrow: "BOP V2 · dealer-economie",
    h1: "Wat één platform waard is voor jouw terrein.",
    sub: "Sleep de schuiven naar jouw autobedrijf. Het model scheidt harde cash-besparing van gewonnen marge — en laat zien waarom bij dunne dealermarges het winstpercentage sterker beweegt dan je zou denken.",
    card1H2: "Jouw autobedrijf", card1Hint: "Vul je echte cijfers in",
    fUnits: "Auto's verkocht per maand", fPrice: "Gemiddelde verkoopprijs", fGm: "Brutomarge per auto", fNm: "Nettomarge (voor winst-%-weergave)",
    card2H2: "Tools die BOP vervangt", card2Hint: "Zet aan wat je nu betaalt · per maand €",
    fRate: "Belaste personeelskosten / uur", fDays: "Dagen-op-terrein verkort door AI", fExtra: "Extra auto's/mnd door vrijgekomen tijd", days15: "15 dagen",
    resLab: "Netto voordeel na BOP-abonnement", per: "per maand &nbsp;·&nbsp; harde cash, vóór groei",
    hsNet: "Netto besparing / jaar", hsTotal: "Met extra units / jaar",
    bdH3: "Maandelijkse verdeling", bTools: "Vervangen tool-abonnementen", bLabour: "Teruggewonnen arbeid", bCarry: "Vermeden voorraadkosten",
    bBop: "DES BOP V2-abonnement", bNet: "Netto harde besparing", bGrowth: "+ Extra bruto (extra units)", bTotmo: "Totaal voordeel / maand",
    pbH3: "Effect op jaarlijkse nettowinst", pbNote: "Omdat dealermarges dun zijn, landen dezelfde euro's als een grote procentuele sprong.", pbBase: "Basis-nettowinst",
    roiPre: "Elke € 1 aan BOP levert", roiPost: "aan harde waarde op.",
    ctaDemo: "Plan een demo →", ctaPlatform: "Bekijk het platform",
    footNote: "<b>Methode.</b> Harde waarde = vervangen tool-abonnementen + teruggewonnen arbeidsuren (AI spec-import, advertentietekst, vertaling, foto-opschoning, publiceren, lead-antwoorden, BTW-voorbereiding) gewaardeerd tegen jouw belaste uurtarief + vermeden voorraad-/floorplankosten door snellere doorloop, minus het € 349/mnd BOP-abonnement. Groei = extra units × bruto-per-auto (zachtere upside). Advertentiekosten van marktplaatsen (Marktplaats, Mobile.de, AutoScout24) tellen <b>niet</b> als besparing — die kanalen lopen sowieso door. Benchmarks: dealers gebruiken gemiddeld ~6,8 software-integraties per verkoop en dunne ~2–3% nettomarges, dus een bescheiden absolute besparing is een groot deel van de winst. Alle cijfers zijn schattingen voor planning — overschrijf elke invoer met je eigen cijfers.",
    tools: ["DMS / voorraad", "CRM / leads", "Facturatie + boekhoudkoppelingen", "Foto / achtergrond-tool", "Multi-channel uploader", "Aparte AI-tekst", "Website feed-sync"],
    hours: (n) => "· " + n + " u/mnd", uplift: (a, b) => `Nettowinst +${a}% (hard) · +${b}% met groei`,
  },
  de: {
    back: "← Zurück zur Plattform", eyebrow: "BOP V2 · Händler-Ökonomie",
    h1: "Was eine Plattform deinem Hof wert ist.",
    sub: "Zieh die Regler auf dein Autohaus. Das Modell trennt harte Ersparnis von gewonnener Marge — und zeigt, warum bei dünnen Händlermargen der Gewinnprozentsatz stärker ausschlägt als erwartet.",
    card1H2: "Dein Autohaus", card1Hint: "Trage deine echten Zahlen ein",
    fUnits: "Verkaufte Autos pro Monat", fPrice: "Durchschnittlicher Verkaufspreis", fGm: "Bruttomarge pro Auto", fNm: "Nettomarge (für Gewinn-%-Ansicht)",
    card2H2: "Tools, die BOP ersetzt", card2Hint: "Aktiviere, was du heute zahlst · monatlich €",
    fRate: "Beladene Personalkosten / Stunde", fDays: "Standtage durch KI reduziert", fExtra: "Extra Autos/Mon. durch freie Zeit", days15: "15 Tage",
    resLab: "Nettonutzen nach BOP-Abo", per: "pro Monat &nbsp;·&nbsp; harte Ersparnis, vor Wachstum",
    hsNet: "Nettoersparnis / Jahr", hsTotal: "Mit Extra-Einheiten / Jahr",
    bdH3: "Monatliche Aufschlüsselung", bTools: "Ersetzte Tool-Abos", bLabour: "Zurückgewonnene Arbeit", bCarry: "Vermiedene Lagerkosten",
    bBop: "DES BOP V2-Abo", bNet: "Netto-Hartersparnis", bGrowth: "+ Zusätzlicher Brutto (Extra-Einheiten)", bTotmo: "Gesamtnutzen / Monat",
    pbH3: "Effekt auf den jährlichen Nettogewinn", pbNote: "Weil Händlermargen dünn sind, landen dieselben Euro als großer prozentualer Sprung.", pbBase: "Basis-Nettogewinn",
    roiPre: "Jeder € 1 für BOP bringt", roiPost: "an hartem Nutzen.",
    ctaDemo: "Demo buchen →", ctaPlatform: "Plattform ansehen",
    footNote: "<b>Methode.</b> Harter Nutzen = ersetzte Tool-Abos + zurückgewonnene Arbeitsstunden (KI-Spec-Import, Anzeigentext, Übersetzung, Foto-Bereinigung, Veröffentlichung, Lead-Antworten, MwSt-Vorbereitung) bewertet mit deinem beladenen Stundensatz + vermiedene Lager-/Floorplan-Kosten durch schnelleren Umschlag, abzüglich des € 349/Mon. BOP-Abos. Wachstum = zusätzliche Einheiten × Brutto-pro-Auto (weichere Aufwärtschance). Anzeigengebühren der Marktplätze (Marktplaats, Mobile.de, AutoScout24) zählen <b>nicht</b> als Ersparnis — diese Kanäle laufen ohnehin weiter. Benchmarks: Händler nutzen im Schnitt ~6,8 Software-Integrationen pro Verkauf und dünne ~2–3% Nettomargen, sodass eine bescheidene absolute Ersparnis ein großer Anteil des Gewinns ist. Alle Zahlen sind Schätzungen zur Planung — überschreibe jede Eingabe mit deinen eigenen.",
    tools: ["DMS / Bestand", "CRM / Leads", "Rechnung + Buchhaltungs-Add-ons", "Foto / Hintergrund-Tool", "Multi-Channel-Uploader", "Separate KI-Texte", "Website-Feed-Sync"],
    hours: (n) => "· " + n + " Std/Mon", uplift: (a, b) => `Nettogewinn +${a}% (hart) · +${b}% mit Wachstum`,
  },
}

const TOOL_COSTS = [220, 120, 90, 45, 110, 60, 75]

function buildMarkup(t: Str, locale: string): string {
  return `
<div class="wrap">
  <a href="/${locale}/platform" class="back">${t.back}</a>
  <div class="head"><span class="mark">DES</span><span class="eyebrow">${t.eyebrow}</span></div>
  <h1>${t.h1}</h1>
  <p class="sub">${t.sub}</p>

  <div class="grid">
    <div>
      <div class="card">
        <h2>${t.card1H2}</h2>
        <div class="hint">${t.card1Hint}</div>
        <div class="field">
          <label>${t.fUnits} <span class="val" id="v_units">25</span></label>
          <input type="range" id="units" min="5" max="80" value="25" step="1">
          <div class="tick"><span>5</span><span>80</span></div>
        </div>
        <div class="field">
          <label>${t.fPrice} <span class="val" id="v_price">€ 18.000</span></label>
          <input type="range" id="price" min="6000" max="60000" value="18000" step="500">
          <div class="tick"><span>€6k</span><span>€60k</span></div>
        </div>
        <div class="field">
          <label>${t.fGm} <span class="val" id="v_gm">9%</span></label>
          <input type="range" id="gm" min="4" max="18" value="9" step="0.5">
          <div class="tick"><span>4%</span><span>18%</span></div>
        </div>
        <div class="field">
          <label>${t.fNm} <span class="val" id="v_nm">2.5%</span></label>
          <input type="range" id="nm" min="1" max="6" value="2.5" step="0.1">
          <div class="tick"><span>1%</span><span>6%</span></div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h2>${t.card2H2}</h2>
        <div class="hint">${t.card2Hint}</div>
        <div class="toggle-row" id="tools"></div>
        <div class="divider"></div>
        <div class="field" style="margin-bottom:8px">
          <label>${t.fRate} <span class="val" id="v_rate">€ 32</span></label>
          <input type="range" id="rate" min="18" max="55" value="32" step="1">
          <div class="tick"><span>€18</span><span>€55</span></div>
        </div>
        <div class="field" style="margin-bottom:8px">
          <label>${t.fDays} <span class="val" id="v_days">6</span></label>
          <input type="range" id="days" min="0" max="15" value="6" step="1">
          <div class="tick"><span>0</span><span>${t.days15}</span></div>
        </div>
        <div class="field" style="margin-bottom:0">
          <label>${t.fExtra} <span class="val" id="v_extra">1.5</span></label>
          <input type="range" id="extra" min="0" max="5" value="1.5" step="0.5">
          <div class="tick"><span>0</span><span>5</span></div>
        </div>
      </div>
    </div>

    <div class="result">
      <div class="headline">
        <div class="lab">${t.resLab}</div>
        <div class="big-num"><span class="cur">€</span><span id="hero">3.849</span></div>
        <div class="per">${t.per}</div>
        <div class="head-split">
          <div class="s"><div class="n" id="hero_yr">€46.187</div><div class="l">${t.hsNet}</div></div>
          <div class="s"><div class="n green" id="hero_total">€75.347</div><div class="l">${t.hsTotal}</div></div>
        </div>
      </div>

      <div class="breakdown">
        <h3>${t.bdH3}</h3>
        <div class="brow"><div class="k"><span class="dot" style="background:var(--plate)"></span>${t.bTools}</div><div class="v" id="b_tools">€ 720</div></div>
        <div class="brow"><div class="k"><span class="dot" style="background:var(--live)"></span>${t.bLabour} <span id="b_hours" style="color:var(--fog-2);font-family:var(--mono);font-size:11px"></span></div><div class="v" id="b_labour">€ 2.912</div></div>
        <div class="brow"><div class="k"><span class="dot" style="background:#85B7EB"></span>${t.bCarry}</div><div class="v" id="b_carry">€ 566</div></div>
        <div class="brow cost"><div class="k"><span class="dot" style="background:var(--alert)"></span>${t.bBop}</div><div class="v" id="b_bop">− € 349</div></div>
        <div class="brow total"><div class="k">${t.bNet}</div><div class="v" id="b_net">€ 3.849</div></div>
        <div class="brow sub"><div class="k">${t.bGrowth}</div><div class="v" id="b_growth">€ 2.430</div></div>
        <div class="brow total"><div class="k">${t.bTotmo}</div><div class="v" id="b_totmo">€ 6.279</div></div>
      </div>

      <div class="profit-band">
        <h3>${t.pbH3}</h3>
        <div class="note">${t.pbNote}</div>
        <div class="pbar-wrap">
          <div class="pbar-lab"><span>${t.pbBase}</span><span id="pl_base">€135.000</span></div>
          <div class="pbar"><div class="base" id="bar_base" style="width:64%"></div><div class="lift" id="bar_lift" style="width:22%"></div></div>
        </div>
        <div class="uplift-tag"><span>▲</span><span id="uplift"></span></div>
        <div class="roi">${t.roiPre} <b id="roi">€ 12</b> ${t.roiPost}</div>
      </div>

      <div class="cta-row">
        <a href="/${locale}/contact" class="btn btn-primary">${t.ctaDemo}</a>
        <a href="/${locale}/platform" class="btn btn-ghost">${t.ctaPlatform}</a>
      </div>
    </div>
  </div>

  <div class="foot-note">${t.footNote}</div>
</div>
`
}

export default function CalculatorClient({ locale = "en" }: { locale?: string }) {
  const lang = STR[locale] ? locale : "en"
  const t = STR[lang]
  useEffect(() => {
    const el = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLElement | null
    const fmt = (n: number) => "€ " + Math.round(n).toLocaleString("nl-NL")
    const fmtc = (n: number) => Math.round(n).toLocaleString("nl-NL")

    const toolDefs: [string, number, boolean][] = t.tools.map((name, i) => [name, TOOL_COSTS[i], true])
    const BOP = 349
    const PER_CAR_MIN = 108
    const OPS_HOURS_BASE = 46
    const toolState = toolDefs.map(t => t[2])

    const toolsWrap = document.getElementById("tools")
    if (toolsWrap) toolsWrap.innerHTML = "" // StrictMode / re-run guard

    const val = (id: string) => Number((el(id) as HTMLInputElement).value)
    const text = (id: string, s: string) => { const e = el(id); if (e) e.textContent = s }

    function calc() {
      const units = val("units"), price = val("price"), gm = val("gm") / 100,
        nm = val("nm") / 100, rate = val("rate"), days = val("days"), extra = val("extra")

      text("v_units", String(units))
      text("v_price", "€ " + fmtc(price))
      text("v_gm", gm * 100 + "%")
      text("v_nm", (nm * 100).toFixed(1) + "%")
      text("v_rate", "€ " + rate)
      text("v_days", String(days))
      text("v_extra", String(extra))

      const tools = toolDefs.reduce((s, t, i) => s + (toolState[i] ? t[1] : 0), 0)
      const listingHours = (PER_CAR_MIN / 60) * units
      const opsHours = OPS_HOURS_BASE * (units / 25)
      const totalHours = listingHours + opsHours
      const labour = totalHours * rate
      const annualUnits = units * 12
      const capPerUnit = price * 0.85, carryDay = capPerUnit * 0.09 / 365
      const carryYr = annualUnits * carryDay * days, carryMo = carryYr / 12
      const grossMo = tools + labour + carryMo
      const netMo = grossMo - BOP
      const grossPerUnit = price * gm
      const growthMo = extra * grossPerUnit
      const totMo = netMo + growthMo

      text("b_tools", fmt(tools))
      text("b_labour", fmt(labour))
      text("b_hours", t.hours(Math.round(totalHours)))
      text("b_carry", fmt(carryMo))
      text("b_bop", "− " + fmt(BOP))
      text("b_net", fmt(netMo))
      text("b_growth", fmt(growthMo))
      text("b_totmo", fmt(totMo))

      text("hero", fmtc(netMo))
      text("hero_yr", fmt(netMo * 12))
      text("hero_total", fmt(totMo * 12))

      const annualRev = units * price * 12
      const baseNet = annualRev * nm
      const hardYr = netMo * 12, totYr = totMo * 12
      text("pl_base", fmt(baseNet))
      const upHard = hardYr / baseNet * 100, upTot = totYr / baseNet * 100
      text("uplift", t.uplift(Math.round(upHard), Math.round(upTot)))
      const baseW = 52
      const liftW = Math.min(46, baseW * (upTot / 100))
      const barBase = el("bar_base") as HTMLElement, barLift = el("bar_lift") as HTMLElement
      if (barBase) barBase.style.width = baseW + "%"
      if (barLift) { barLift.style.width = liftW + "%"; barLift.textContent = "+" + fmt(totYr).replace("€ ", "€") }
      text("roi", "€ " + (grossMo / BOP).toFixed(0))
    }

    // build tool chips
    if (toolsWrap) {
      toolDefs.forEach((t, i) => {
        const c = document.createElement("div")
        c.className = "chip" + (t[2] ? " on" : "")
        c.innerHTML = `<span class="box">${t[2] ? "✓" : ""}</span>${t[0]} <span class="cost">€${t[1]}</span>`
        c.onclick = () => {
          toolState[i] = !toolState[i]
          c.classList.toggle("on", toolState[i])
          const box = c.querySelector(".box")
          if (box) box.textContent = toolState[i] ? "✓" : ""
          calc()
        }
        toolsWrap.appendChild(c)
      })
    }

    const ids = ["units", "price", "gm", "nm", "rate", "days", "extra"]
    ids.forEach(id => el(id)?.addEventListener("input", calc))
    calc()

    return () => {
      ids.forEach(id => el(id)?.removeEventListener("input", calc))
      if (toolsWrap) toolsWrap.innerHTML = ""
    }
  }, [lang, t])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bopv2" dangerouslySetInnerHTML={{ __html: buildMarkup(t, lang) }} />
    </>
  )
}
