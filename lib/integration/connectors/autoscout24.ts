/**
 * AutoScout24 Classified API connector (outbound publish / update / delete).
 *
 * API reference: https://classified-api.autoscout24.com (Bearer token, REST)
 * Credentials:   Set AUTOSCOUT24_CLIENT_ID + AUTOSCOUT24_CLIENT_SECRET + AUTOSCOUT24_DEALER_ID in .env.local
 *                Token endpoint: https://api.autoscout24.com/oauth/token (client_credentials)
 *
 * Fuel codes:    AutoScout24 uses short codes: P=petrol, D=diesel, E=electric, H=hydrogen, L=lpg, etc.
 *                Seed via IT006 with table_key = 'autoscout24.fuel'.
 * Body types:    Numeric codes — seed via IT006 with table_key = 'autoscout24.body_type'.
 */

export interface AutoScout24Result {
  listingId?: string;
  url?: string;
}

export interface AS24PublishPayload {
  listing_id:    string;
  make:          string;
  model:         string;
  year:          number | null;
  mileage_km:    number | null;
  fuel_code:     string;       // AS24 fuel code: P/D/E/H/L/G/… (from int_lookup_values)
  body_type_code: string;      // AS24 body type code (from int_lookup_values)
  power_kw:      number | null;
  gearbox:       string | null; // 'M' manual, 'A' automatic
  doors:         number | null;
  color:         string | null;
  price_eur:     number | null;
  description_nl: string;
  description_en?: string;
  image_urls:    string[];
  vin:           string | null;
  first_reg:     string | null; // YYYY-MM-DD
}

const AUTH_URL = 'https://api.autoscout24.com/oauth/token';
const BASE_URL = 'https://classified-api.autoscout24.com';
const TIMEOUT  = 15_000;

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'classified-api' }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`AutoScout24 auth failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.access_token;
}

function headers(token: string, dealerId: string) {
  return {
    Authorization: `Bearer ${token}`,
    'X-AS24-dealer-id': dealerId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function apiCall(method: string, path: string, token: string, dealerId: string, body?: unknown): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(token, dealerId),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AS24 API ${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function buildListingBody(
  payload: AS24PublishPayload,
  descriptions: { languageId: string; text: string }[],
) {
  const vehicle: Record<string, unknown> = { make: payload.make, model: payload.model };
  if (payload.year)           vehicle.firstRegistration = { year: payload.year };
  if (payload.mileage_km)     vehicle.mileage = { value: payload.mileage_km, unit: 'km' };
  if (payload.fuel_code)      vehicle.fuel = payload.fuel_code;
  if (payload.body_type_code) vehicle.bodyType = payload.body_type_code;
  if (payload.power_kw)       vehicle.power = { value: payload.power_kw, unit: 'kW' };
  if (payload.gearbox)        vehicle.gearbox = payload.gearbox;
  if (payload.doors)          vehicle.numberOfDoors = payload.doors;
  if (payload.color)          vehicle.colour = payload.color;
  if (payload.vin)            vehicle.vin = payload.vin;
  return {
    vehicle,
    prices: payload.price_eur !== null
      ? [{ type: 'SELLING', value: payload.price_eur, currency: 'EUR' }]
      : [],
    descriptions,
    images: payload.image_urls.map((url, i) => ({ url, mainImage: i === 0 })),
  };
}

export async function as24Publish(payload: AS24PublishPayload, sys: any): Promise<AutoScout24Result> {
  const clientId     = process.env.AUTOSCOUT24_CLIENT_ID     ?? sys?.config?.client_id;
  const clientSecret = process.env.AUTOSCOUT24_CLIENT_SECRET ?? sys?.config?.client_secret;
  const dealerId     = process.env.AUTOSCOUT24_DEALER_ID     ?? sys?.config?.dealer_id;
  if (!clientId || !clientSecret || !dealerId)
    throw new Error('AutoScout24 credentials not configured (AUTOSCOUT24_CLIENT_ID / AUTOSCOUT24_CLIENT_SECRET / AUTOSCOUT24_DEALER_ID)');

  const token = await getToken(clientId, clientSecret);

  const descriptions: any[] = [{ languageId: 'NL', text: payload.description_nl }];
  if (payload.description_en) descriptions.push({ languageId: 'EN', text: payload.description_en });

  const body = buildListingBody(payload, descriptions);

  const result = await apiCall('POST', '/classified-ads', token, dealerId, body);
  return {
    listingId: result?.id ?? result?.classifiedId,
    url: result?.url ?? (result?.id ? `https://www.autoscout24.nl/lst/${result.id}` : undefined),
  };
}

export async function as24Update(externalId: string, payload: Partial<AS24PublishPayload>, sys: any): Promise<void> {
  const clientId     = process.env.AUTOSCOUT24_CLIENT_ID     ?? sys?.config?.client_id;
  const clientSecret = process.env.AUTOSCOUT24_CLIENT_SECRET ?? sys?.config?.client_secret;
  const dealerId     = process.env.AUTOSCOUT24_DEALER_ID     ?? sys?.config?.dealer_id;
  if (!clientId || !clientSecret || !dealerId) throw new Error('AutoScout24 credentials not configured');
  const token = await getToken(clientId, clientSecret);
  const patch: Record<string, unknown> = {};
  if (payload.price_eur !== null) patch.prices = [{ type: 'SELLING', value: payload.price_eur, currency: 'EUR' }];
  if (payload.description_nl) patch.descriptions = [{ languageId: 'NL', text: payload.description_nl }];
  await apiCall('PATCH', `/classified-ads/${externalId}`, token, dealerId, patch);
}

export async function as24Delete(externalId: string, sys: any): Promise<void> {
  const clientId     = process.env.AUTOSCOUT24_CLIENT_ID     ?? sys?.config?.client_id;
  const clientSecret = process.env.AUTOSCOUT24_CLIENT_SECRET ?? sys?.config?.client_secret;
  const dealerId     = process.env.AUTOSCOUT24_DEALER_ID     ?? sys?.config?.dealer_id;
  if (!clientId || !clientSecret || !dealerId) throw new Error('AutoScout24 credentials not configured');
  const token = await getToken(clientId, clientSecret);
  await apiCall('DELETE', `/classified-ads/${externalId}`, token, dealerId);
}
