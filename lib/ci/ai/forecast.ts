// CI-T43 — Demand Forecasting
// Seasonal naive baseline, Holt-Winters (additive), MAPE, backtest harness.

const TENANT_ID = 400;
const SEASON = 7; // weekly seasonality

type Supabase = { from: (t: string) => any };

// ── Seasonal Naive ──────────────────────────────────────────────
// Forecast = value from `seasonLength` periods ago, repeated.

export function seasonalNaive(
  history: number[],
  seasonLength: number,
  horizon: number,
): number[] {
  const n = history.length;
  const out: number[] = [];
  for (let h = 0; h < horizon; h++) {
    const idx = n - seasonLength + (h % seasonLength);
    out.push(idx >= 0 ? history[idx] : 0);
  }
  return out;
}

// ── Holt-Winters (additive seasonality) ─────────────────────────

export function holtWinters(
  history: number[],
  seasonLength: number,
  horizon: number,
  alpha = 0.3,
  beta = 0.05,
  gamma = 0.3,
): number[] {
  const n = history.length;
  if (n < seasonLength * 2) {
    // Not enough data — fall back to seasonal naive
    return seasonalNaive(history, seasonLength, horizon);
  }

  // Initialize level: mean of first season
  const firstSeason = history.slice(0, seasonLength);
  const secondSeason = history.slice(seasonLength, seasonLength * 2);
  const mean1 = firstSeason.reduce((a, b) => a + b, 0) / seasonLength;
  const mean2 = secondSeason.reduce((a, b) => a + b, 0) / seasonLength;

  let level = mean1;
  let trend = (mean2 - mean1) / seasonLength;

  // Initialize seasonal indices from first season
  const seasonal = firstSeason.map(v => v - mean1);

  // Smooth over history
  for (let t = 0; t < n; t++) {
    const sIdx = t % seasonLength;
    const y = history[t];
    const prevLevel = level;

    level = alpha * (y - seasonal[sIdx]) + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[sIdx] = gamma * (y - level) + (1 - gamma) * seasonal[sIdx];
  }

  // Forecast
  const out: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const sIdx = (n + h - 1) % seasonLength;
    out.push(Math.max(0, level + h * trend + seasonal[sIdx]));
  }
  return out;
}

// ── MAPE ────────────────────────────────────────────────────────

export function mape(actual: number[], forecast: number[]): number {
  let sum = 0;
  let count = 0;
  const len = Math.min(actual.length, forecast.length);
  for (let i = 0; i < len; i++) {
    if (actual[i] === 0) continue; // skip zero actuals
    sum += Math.abs((actual[i] - forecast[i]) / actual[i]);
    count++;
  }
  return count === 0 ? 0 : (sum / count) * 100;
}

// ── Backtest harness ────────────────────────────────────────────

export interface BacktestResult {
  naive: { forecast: number[]; mape: number };
  hw:    { forecast: number[]; mape: number };
  winner: 'naive' | 'hw';
}

export async function backtestForecast(
  supabase: Supabase,
  productId?: string,
  horizon = 14,
): Promise<BacktestResult> {
  const table = productId ? 'ci_daily_product' : 'ci_daily_sales';
  let query = supabase
    .from(table)
    .select('fact_date, net_sales_cents')
    .eq('tenant_id', TENANT_ID)
    .order('fact_date', { ascending: true });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data: rows } = await query;
  const values: number[] = (rows ?? []).map((r: any) => r.net_sales_cents ?? 0);

  if (values.length < horizon + SEASON * 2) {
    // Not enough data for a meaningful backtest
    const empty = new Array(horizon).fill(0);
    return {
      naive: { forecast: empty, mape: 0 },
      hw:    { forecast: empty, mape: 0 },
      winner: 'hw',
    };
  }

  const train = values.slice(0, -horizon);
  const test  = values.slice(-horizon);

  const naiveFc = seasonalNaive(train, SEASON, horizon);
  const hwFc    = holtWinters(train, SEASON, horizon);

  const naiveMape = mape(test, naiveFc);
  const hwMape    = mape(test, hwFc);

  return {
    naive: { forecast: naiveFc, mape: naiveMape },
    hw:    { forecast: hwFc,    mape: hwMape },
    winner: hwMape <= naiveMape ? 'hw' : 'naive',
  };
}

// ── Forecast runner ─────────────────────────────────────────────

export interface ForecastResult {
  forecast: number[];
  method: 'naive' | 'hw';
  backtest: BacktestResult;
}

export async function generateForecasts(
  supabase: Supabase,
  horizon = 14,
): Promise<ForecastResult> {
  // Backtest to pick the best method
  const bt = await backtestForecast(supabase, undefined, horizon);

  // Fetch full history for final forecast
  const { data: rows } = await supabase
    .from('ci_daily_sales')
    .select('fact_date, net_sales_cents')
    .eq('tenant_id', TENANT_ID)
    .order('fact_date', { ascending: true });

  const values: number[] = (rows ?? []).map((r: any) => r.net_sales_cents ?? 0);

  const forecast = bt.winner === 'hw'
    ? holtWinters(values, SEASON, horizon)
    : seasonalNaive(values, SEASON, horizon);

  return { forecast, method: bt.winner, backtest: bt };
}
