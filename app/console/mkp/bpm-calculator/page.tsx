'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const TARIEVEN: Record<number, any> = {
  2026: {
    personenauto: {
      schijven: [
        { tot: 77,  vast: 687,   perGram: 2,   volledigCO2: true },
        { tot: 100, vast: 841,   perGram: 82,  ondergrens: 77 },
        { tot: 139, vast: 2727,  perGram: 181, ondergrens: 100 },
        { tot: 155, vast: 9786,  perGram: 297, ondergrens: 139 },
        { tot: Infinity, vast: 14538, perGram: 594, ondergrens: 155 },
      ],
      dieseltoeslag: { drempel: 69, tarief: 114.83 },
    },
    bestelauto: { tariefPerGram: 77.77, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2025: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 599, perGram: 2, volledigCO2: true },
        { tot: 102, vast: 757, perGram: 79, ondergrens: 79 },
        { tot: 141, vast: 2493, perGram: 175, ondergrens: 102 },
        { tot: 157, vast: 9143, perGram: 289, ondergrens: 141 },
        { tot: Infinity, vast: 13765, perGram: 577, ondergrens: 157 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 111.06 },
    },
    bestelauto: { tariefPerGram: 76.57, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2024: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 599, perGram: 2, volledigCO2: true },
        { tot: 102, vast: 757, perGram: 79, ondergrens: 79 },
        { tot: 141, vast: 2493, perGram: 175, ondergrens: 102 },
        { tot: 157, vast: 9143, perGram: 289, ondergrens: 141 },
        { tot: Infinity, vast: 13765, perGram: 577, ondergrens: 157 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 111.06 },
    },
    bestelauto: { tariefPerGram: 76.57, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2023: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 599, perGram: 2, volledigCO2: true },
        { tot: 102, vast: 757, perGram: 79, ondergrens: 79 },
        { tot: 141, vast: 2493, perGram: 175, ondergrens: 102 },
        { tot: 157, vast: 9143, perGram: 289, ondergrens: 141 },
        { tot: Infinity, vast: 13765, perGram: 577, ondergrens: 157 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 111.06 },
    },
    bestelauto: { tariefPerGram: 76.57, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2022: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 599, perGram: 2, volledigCO2: true },
        { tot: 102, vast: 757, perGram: 79, ondergrens: 79 },
        { tot: 141, vast: 2493, perGram: 175, ondergrens: 102 },
        { tot: 157, vast: 9143, perGram: 289, ondergrens: 141 },
        { tot: Infinity, vast: 13765, perGram: 577, ondergrens: 157 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 111.06 },
    },
    bestelauto: { tariefPerGram: 76.57, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2021: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 599, perGram: 2, volledigCO2: true },
        { tot: 106, vast: 757, perGram: 79, ondergrens: 79 },
        { tot: 155, vast: 2820, perGram: 161, ondergrens: 106 },
        { tot: 170, vast: 10697, perGram: 275, ondergrens: 155 },
        { tot: Infinity, vast: 14822, perGram: 547, ondergrens: 170 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 104.76 },
    },
    bestelauto: { tariefPerGram: 72.24, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2020: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 360, perGram: 2, volledigCO2: true },
        { tot: 106, vast: 518, perGram: 79, ondergrens: 79 },
        { tot: 155, vast: 2649, perGram: 161, ondergrens: 106 },
        { tot: 170, vast: 10534, perGram: 275, ondergrens: 155 },
        { tot: Infinity, vast: 14659, perGram: 547, ondergrens: 170 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 99.16 },
    },
    bestelauto: { tariefPerGram: 68.54, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2019: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 175, perGram: 2, volledigCO2: true },
        { tot: 106, vast: 333, perGram: 69, ondergrens: 79 },
        { tot: 155, vast: 2196, perGram: 148, ondergrens: 106 },
        { tot: 170, vast: 9448, perGram: 327, ondergrens: 155 },
        { tot: Infinity, vast: 14353, perGram: 519, ondergrens: 170 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 86.59 },
    },
    bestelauto: { tariefPerGram: 63.85, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2018: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 175, perGram: 6, volledigCO2: true },
        { tot: 106, vast: 649, perGram: 69, ondergrens: 79 },
        { tot: 155, vast: 2512, perGram: 148, ondergrens: 106 },
        { tot: 170, vast: 9616, perGram: 327, ondergrens: 155 },
        { tot: Infinity, vast: 14521, perGram: 519, ondergrens: 170 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 86.59 },
    },
    bestelauto: { tariefPerGram: 63.85, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2017: {
    personenauto: {
      schijven: [
        { tot: 79, vast: 175, perGram: 6, volledigCO2: true },
        { tot: 106, vast: 649, perGram: 69, ondergrens: 79 },
        { tot: 155, vast: 2512, perGram: 148, ondergrens: 106 },
        { tot: 170, vast: 9616, perGram: 327, ondergrens: 155 },
        { tot: Infinity, vast: 14521, perGram: 519, ondergrens: 170 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 86.59 },
    },
    bestelauto: { tariefPerGram: 63.85, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2016: {
    personenauto: {
      schijven: [
        { tot: 82, vast: 175, perGram: 6, volledigCO2: true },
        { tot: 110, vast: 667, perGram: 69, ondergrens: 82 },
        { tot: 160, vast: 2598, perGram: 148, ondergrens: 110 },
        { tot: 175, vast: 9998, perGram: 327, ondergrens: 160 },
        { tot: Infinity, vast: 14903, perGram: 519, ondergrens: 175 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 86.59 },
    },
    bestelauto: { tariefPerGram: 63.85, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
  2015: {
    personenauto: {
      schijven: [
        { tot: 82, vast: 175, perGram: 6, volledigCO2: true },
        { tot: 110, vast: 667, perGram: 69, ondergrens: 82 },
        { tot: 160, vast: 2598, perGram: 148, ondergrens: 110 },
        { tot: 175, vast: 9998, perGram: 327, ondergrens: 160 },
        { tot: Infinity, vast: 14903, perGram: 519, ondergrens: 175 },
      ],
      dieseltoeslag: { drempel: 70, tarief: 86.59 },
    },
    bestelauto: { tariefPerGram: 63.85, co2Onbekend: 330 },
    kampeerauto: { percentage: 0.377, diesel: 273, nietDiesel: -1283 },
  },
};

const AFSCHRIJVING = [
  { vanMnd: 0,   totMnd: 1,        basis: 0,     perMnd: 12    },
  { vanMnd: 1,   totMnd: 3,        basis: 12,    perMnd: 4     },
  { vanMnd: 3,   totMnd: 5,        basis: 20,    perMnd: 3.5   },
  { vanMnd: 5,   totMnd: 9,        basis: 27,    perMnd: 1.5   },
  { vanMnd: 9,   totMnd: 18,       basis: 33,    perMnd: 1     },
  { vanMnd: 18,  totMnd: 30,       basis: 42,    perMnd: 0.75  },
  { vanMnd: 30,  totMnd: 42,       basis: 51,    perMnd: 0.5   },
  { vanMnd: 42,  totMnd: 54,       basis: 57,    perMnd: 0.42  },
  { vanMnd: 54,  totMnd: 66,       basis: 62,    perMnd: 0.42  },
  { vanMnd: 66,  totMnd: 78,       basis: 67,    perMnd: 0.42  },
  { vanMnd: 78,  totMnd: 90,       basis: 72,    perMnd: 0.25  },
  { vanMnd: 90,  totMnd: 102,      basis: 75,    perMnd: 0.25  },
  { vanMnd: 102, totMnd: 114,      basis: 78,    perMnd: 0.25  },
  { vanMnd: 114, totMnd: Infinity, basis: 81,    perMnd: 0.19  },
];

type VType = 'personenauto' | 'bestelauto' | 'kampeerauto';
type Modus = 'nieuw' | 'import';

interface RLine { label: string; value: string; bold?: boolean; hl?: boolean; sep?: boolean }

function getTarieven(jaar: number) {
  if (TARIEVEN[jaar]) return TARIEVEN[jaar];
  const jaren = Object.keys(TARIEVEN).map(Number).sort((a, b) => a - b);
  let closest = jaren[0];
  for (const j of jaren) if (Math.abs(j - jaar) < Math.abs(closest - jaar)) closest = j;
  return { ...TARIEVEN[closest], _fallback: closest };
}

function calcPA(co2: number, fuel: string, jaar: number) {
  const t = getTarieven(jaar);
  let bpm = 0;
  for (const s of t.personenauto.schijven) {
    if (co2 <= s.tot || s.tot === Infinity) {
      bpm = s.volledigCO2 ? s.vast + s.perGram * co2 : s.vast + s.perGram * (co2 - s.ondergrens);
      break;
    }
  }
  let diesel = 0;
  if (fuel === 'diesel') {
    const boven = co2 - t.personenauto.dieseltoeslag.drempel;
    if (boven > 0) diesel = boven * t.personenauto.dieseltoeslag.tarief;
  }
  return { bpm: Math.round(bpm), diesel: Math.round(diesel), totaal: Math.round(bpm + diesel) };
}

function calcBA(co2: number, jaar: number) {
  const t = getTarieven(jaar);
  if (co2 === 0) return { bpm: 0, nul: true };
  return { bpm: Math.round(co2 * t.bestelauto.tariefPerGram) };
}

function calcKA(prijs: number, fuel: string, jaar: number) {
  const t = getTarieven(jaar);
  const pct = prijs * t.kampeerauto.percentage;
  const cor = fuel === 'diesel' ? t.kampeerauto.diesel : t.kampeerauto.nietDiesel;
  return { pct: Math.round(pct * 100) / 100, cor, totaal: Math.round(Math.max(0, pct + cor)) };
}

function calcAfschr(d1: string, d2: string) {
  const a = new Date(d1), b = new Date(d2);
  if (b <= a) return 0;
  const dagen = Math.floor((b.getTime() - a.getTime()) / 86400000);
  let mnd = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() > a.getDate()) mnd++;
  if (dagen > 0 && mnd === 0) mnd = 1;
  for (const band of AFSCHRIJVING) {
    if (mnd <= band.vanMnd) continue;
    if (mnd <= band.totMnd || band.totMnd === Infinity) {
      return Math.min(100, Math.round((band.basis + band.perMnd * (mnd - band.vanMnd)) * 100) / 100);
    }
  }
  return 0;
}

function leeftijd(d1: string, d2: string) {
  const a = new Date(d1), b = new Date(d2);
  let jr = b.getFullYear() - a.getFullYear();
  let mn = b.getMonth() - a.getMonth();
  if (b.getDate() < a.getDate()) mn--;
  if (mn < 0) { jr--; mn += 12; }
  const p: string[] = [];
  if (jr > 0) p.push(`${jr} jaar`);
  if (mn > 0) p.push(`${mn} maand${mn !== 1 ? 'en' : ''}`);
  return p.length ? p.join(', ') : '< 1 maand';
}

function eur(n: number) { return '€ ' + Math.round(n).toLocaleString('nl-NL'); }

const TYPES: { key: VType; label: string; sub: string }[] = [
  { key: 'personenauto', label: 'Personenauto', sub: 'Auto / SUV / MPV' },
  { key: 'bestelauto',   label: 'Bestelauto',   sub: 'Bestel / bedrijfswagen' },
  { key: 'kampeerauto',  label: 'Kampeerauto',  sub: 'Camper / motorhome' },
];
const PA_FUELS = ['benzine', 'diesel', 'hybride', 'elektrisch'] as const;

export default function BpmCalculatorPage() {
  const [vtype, setVtype] = useState<VType>('personenauto');
  const [modus, setModus] = useState<Modus>('nieuw');
  const [paCo2, setPaCo2] = useState('');
  const [paFuel, setPaFuel] = useState('benzine');
  const [baCo2, setBaCo2] = useState('');
  const [baUnk, setBaUnk] = useState(false);
  const [kaPrijs, setKaPrijs] = useState('');
  const [kaFuel, setKaFuel] = useState('diesel');
  const [kaBrutoOn, setKaBrutoOn] = useState(false);
  const [kaBruto, setKaBruto] = useState('');
  const [impDate, setImpDate] = useState('');
  const [impBruto, setImpBruto] = useState('');

  const numParse = (v: string) => v.replace(/[^0-9]/g, '');
  const fmtNum = (v: string) => { const n = parseInt(numParse(v)); return isNaN(n) ? '' : n.toLocaleString('nl-NL'); };

  function compute(): { lines: RLine[]; notices: string[] } | null {
    const lines: RLine[] = [];
    const notices: string[] = [];
    const isImp = modus === 'import';
    let jaar = 2026;
    let fb: number | null = null;

    if (isImp && impDate) {
      jaar = new Date(impDate).getFullYear();
      const t = getTarieven(jaar);
      if (t._fallback) fb = t._fallback;
    }

    if (isImp) {
      if (!impDate && !impBruto) return null;
      if (impDate) {
        const d = new Date(impDate);
        if (d > new Date()) { notices.push('⚠ Datum kan niet in de toekomst liggen.'); return null; }
        if (d.getFullYear() < 1950) return null;
      }
    }

    const override = isImp && impBruto && parseInt(impBruto) > 0;
    let bruto = 0;

    if (vtype === 'personenauto') {
      const co2 = parseInt(paCo2);
      if (isNaN(co2)) return null;
      if (co2 < 0 || co2 > 500) return null;
      if (!override) {
        const r = calcPA(co2, paFuel, jaar);
        bruto = r.totaal;
        lines.push({ label: 'CO₂-uitstoot', value: `${co2} g/km` });
        lines.push({ label: 'Brandstof', value: paFuel });
        lines.push({ label: 'Tariefjaar', value: String(fb || jaar) });
        lines.push({ label: 'BPM (schijventarief)', value: eur(r.bpm) });
        if (r.diesel > 0) lines.push({ label: 'Dieseltoeslag', value: `+ ${eur(r.diesel)}` });
        lines.push({ label: 'Bruto BPM', value: eur(bruto), bold: true });
        if (co2 === 0) notices.push('Voor EV’s kunnen afwijkende regels en vrijstellingen gelden.');
      } else {
        bruto = parseInt(impBruto);
        lines.push({ label: 'Bruto BPM (handmatig)', value: eur(bruto), bold: true });
      }
    } else if (vtype === 'bestelauto') {
      const co2 = baUnk ? 330 : parseInt(baCo2);
      if (isNaN(co2)) return null;
      if (co2 < 0 || co2 > 500) return null;
      if (!override) {
        const r = calcBA(co2, jaar);
        bruto = r.bpm;
        lines.push({ label: 'CO₂-uitstoot', value: `${co2} g/km${baUnk ? ' (wettelijk vast)' : ''}` });
        lines.push({ label: 'Tariefjaar', value: String(fb || jaar) });
        lines.push({ label: 'Bruto BPM', value: eur(bruto), bold: true });
        if (r.nul) notices.push('Bij 0 g/km: geen BPM verschuldigd, aangifte blijft verplicht.');
        if (baUnk) notices.push('Gerekend met wettelijk vastgestelde 330 g/km — aanzienlijk hogere BPM.');
      } else {
        bruto = parseInt(impBruto);
        lines.push({ label: 'Bruto BPM (handmatig)', value: eur(bruto), bold: true });
      }
    } else {
      const raw = numParse(kaPrijs);
      const prijs = parseInt(raw);
      if (isNaN(prijs) || prijs <= 0) return null;
      if (!override) {
        const r = calcKA(prijs, kaFuel, jaar);
        bruto = r.totaal;
        lines.push({ label: 'Netto catalogusprijs', value: eur(prijs) });
        lines.push({ label: 'Brandstof', value: kaFuel === 'diesel' ? 'Diesel' : 'Benzine/LPG/overig' });
        lines.push({ label: 'Tariefjaar', value: String(fb || jaar) });
        lines.push({ label: `37,7% van ${eur(prijs)}`, value: eur(r.pct) });
        lines.push({ label: r.cor >= 0 ? 'Dieseltoeslag' : 'Brandstofcorrectie', value: `${r.cor >= 0 ? '+' : '−'} ${eur(Math.abs(r.cor))}` });
        lines.push({ label: 'Bruto BPM', value: eur(bruto), bold: true });
      } else {
        bruto = parseInt(impBruto);
        lines.push({ label: 'Bruto BPM (handmatig)', value: eur(bruto), bold: true });
      }
    }

    if (fb) notices.push(`Tarieven ${jaar} niet beschikbaar, gerekend met ${fb} (indicatief).`);

    let resultaat = bruto;
    if (isImp && impDate) {
      const nu = new Date().toISOString().split('T')[0];
      const pct = calcAfschr(impDate, nu);
      resultaat = Math.max(0, Math.round(bruto * (1 - pct / 100)));
      lines.push({ label: '', value: '', sep: true });
      lines.push({ label: 'Leeftijd voertuig', value: leeftijd(impDate, nu) });
      lines.push({ label: 'Afschrijving (forfaitair)', value: pct.toFixed(2).replace('.', ',') + '%' });
      notices.push('Een koerslijst of taxatierapport levert vaak een lagere BPM op dan de forfaitaire tabel.');
    }

    if (isImp && !impDate && impBruto) {
      notices.push('Vul datum eerste toelating in voor de afschrijvingsberekening.');
    }

    lines.push({ label: '', value: '', sep: true });
    lines.push({ label: 'TE BETALEN BPM', value: eur(resultaat), hl: true });
    return { lines, notices };
  }

  function handleReset() {
    setPaCo2(''); setBaCo2(''); setKaPrijs(''); setKaBruto('');
    setImpDate(''); setImpBruto(''); setBaUnk(false); setKaBrutoOn(false);
  }

  function handleCopy(lines: RLine[]) {
    const txt = lines.filter(l => !l.sep).map(l => l.label.padEnd(40) + l.value).join('\n');
    navigator.clipboard.writeText(txt);
  }

  const result = compute();

  return (
    <div>
      <ScreenHeader title="BPM Calculator" description="MP006 — BPM berekenen: personenauto, bestelauto, kampeerauto" />

      {/* Type cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {TYPES.map(t => (
          <button key={t.key} onClick={() => setVtype(t.key)}
            className={`rounded-xl border-2 p-4 text-center transition-all ${vtype === t.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
            <div className="font-bold text-sm text-slate-800">{t.label}</div>
            <div className="text-[11px] text-slate-400 mt-1">{t.sub}</div>
          </button>
        ))}
      </div>

      {/* Mode */}
      <div className="flex gap-2 mb-5">
        {(['nieuw', 'import'] as Modus[]).map(m => (
          <button key={m} onClick={() => setModus(m)}
            className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${modus === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
            {m === 'nieuw' ? 'Nieuw voertuig' : 'Import gebruikt'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Inputs */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">

          {vtype === 'personenauto' && <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">CO&#x2082;-uitstoot (g/km, WLTP)</label>
              <input type="number" min={0} max={500} value={paCo2} onChange={e => setPaCo2(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="bijv. 120" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Brandstof</label>
              <div className="flex gap-2 flex-wrap">
                {PA_FUELS.map(f => (
                  <button key={f} onClick={() => setPaFuel(f)}
                    className={`rounded-lg border-2 px-4 py-1.5 text-xs font-medium transition-all ${paFuel === f ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </>}

          {vtype === 'bestelauto' && <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">CO&#x2082;-uitstoot (g/km)</label>
              <input type="number" min={0} max={500} value={baUnk ? '330' : baCo2} disabled={baUnk}
                onChange={e => setBaCo2(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100" placeholder="bijv. 180" />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={baUnk} onChange={e => setBaUnk(e.target.checked)} className="h-4 w-4 rounded" />
              CO&#x2082; onbekend (rekent met 330 g/km)
            </label>
            {baUnk && <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-800">
              330 g/km levert aanzienlijk hogere BPM. Controleer of de uitstoot niet alsnog te achterhalen is.
            </div>}
            <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700">
              Ondernemersvrijstelling is per 1-1-2025 vervallen. Alle bestelauto&apos;s zijn nu BPM-plichtig.
            </div>
          </>}

          {vtype === 'kampeerauto' && <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Netto catalogusprijs (&euro;)</label>
              <input type="text" inputMode="numeric" value={kaPrijs} disabled={kaBrutoOn}
                onChange={e => setKaPrijs(fmtNum(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100" placeholder="bijv. 27.250" />
              <p className="text-[11px] text-slate-400 mt-1">Incl. opties, <strong>excl. BTW en excl. BPM</strong></p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={kaBrutoOn}
                onChange={e => { setKaBrutoOn(e.target.checked); if (!e.target.checked) setKaBruto(''); }}
                className="h-4 w-4 rounded" />
              Ik ken alleen de bruto prijs (incl. BTW, excl. BPM)
            </label>
            {kaBrutoOn && <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bruto catalogusprijs excl. BPM (&euro;)</label>
              <input type="text" inputMode="numeric" value={kaBruto}
                onChange={e => {
                  const v = fmtNum(e.target.value);
                  setKaBruto(v);
                  const n = parseInt(numParse(v));
                  if (!isNaN(n) && n > 0) setKaPrijs(Math.round(n / 1.21).toLocaleString('nl-NL'));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="bijv. 32.972" />
              <p className="text-[11px] text-slate-400 mt-1">Gedeeld door 1,21 (BTW) = netto prijs</p>
            </div>}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Brandstof</label>
              <div className="flex gap-2">
                {[{ k: 'diesel', l: 'Diesel' }, { k: 'anders', l: 'Benzine/LPG/overig' }].map(f => (
                  <button key={f.k} onClick={() => setKaFuel(f.k)}
                    className={`rounded-lg border-2 px-4 py-1.5 text-xs font-medium transition-all ${kaFuel === f.k ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
          </>}

          {modus === 'import' && <>
            <hr className="border-slate-200" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Importgegevens</p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Datum eerste toelating</label>
              <input type="date" value={impDate} onChange={e => setImpDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bruto BPM bekend? (optioneel, &euro;)</label>
              <input type="number" min={0} value={impBruto} onChange={e => setImpBruto(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="bijv. 10545" />
              <p className="text-[11px] text-slate-400 mt-1">Slaat tariefberekening over, past alleen afschrijving toe</p>
            </div>
          </>}

          <button onClick={handleReset} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50">Reset</button>
        </div>

        {/* Result */}
        <div>
          {result ? (
            <div className="rounded-xl border-2 border-emerald-400 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Resultaat</h3>
              <div className="space-y-1">
                {result.lines.map((l, i) =>
                  l.sep ? <hr key={i} className="border-slate-200 my-2" /> : (
                    <div key={i} className={`flex justify-between text-sm ${l.hl ? 'text-base font-extrabold text-slate-900 border-t-2 border-slate-200 pt-3 mt-2' : l.bold ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                      <span>{l.label}</span>
                      <span className="font-semibold whitespace-nowrap">{l.value}</span>
                    </div>
                  )
                )}
              </div>
              {result.notices.length > 0 && (
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1">
                  {result.notices.map((n, i) => <p key={i} className="text-xs text-amber-800">{n}</p>)}
                </div>
              )}
              <p className="text-[10px] text-slate-400 italic mt-4">Indicatie op basis van forfaitaire tabel. Geen rechten aan te ontlenen.</p>
              <button onClick={() => handleCopy(result.lines)} className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">Kopieer berekening</button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">
              Vul de voertuiggegevens in om de BPM te berekenen
            </div>
          )}

          <details className="mt-4 rounded-xl border border-slate-200 bg-white">
            <summary className="px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer">Forfaitaire afschrijvingstabel</summary>
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-slate-50">
                  <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">Vanaf</th>
                  <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">Tot</th>
                  <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold">Basis %</th>
                  <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold">Per mnd</th>
                </tr></thead>
                <tbody>
                  {AFSCHRIJVING.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-2 py-1">{r.vanMnd} mnd</td>
                      <td className="border border-slate-200 px-2 py-1">{r.totMnd === Infinity ? '—' : `${r.totMnd} mnd`}</td>
                      <td className="border border-slate-200 px-2 py-1 text-right">{r.basis}%</td>
                      <td className="border border-slate-200 px-2 py-1 text-right">{r.perMnd}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
