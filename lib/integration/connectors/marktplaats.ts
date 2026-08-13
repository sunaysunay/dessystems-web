/**
 * Marktplaats Classified API connector (outbound publish / update / delete).
 *
 * API reference: https://api.marktplaats.nl (OAuth2, v1 REST)
 * Credentials:   Set MARKTPLAATS_CLIENT_ID + MARKTPLAATS_CLIENT_SECRET in .env.local
 *                The connector fetches a client_credentials token per call (short-lived).
 *
 * Category IDs:  Marktplaats uses numeric category IDs (not the DES category slug).
 *                Seed the mapping via IT006 with table_key = 'marktplaats.categories'.
 *                Example: { source_code: 'van', target_code: '91', label: 'Bedrijfswagens' }
 */

export interface MarktplaatsListing {
  listingId?: string;    // external ID returned by Marktplaats on create
  url?: string;          // public listing URL
}

export interface PublishPayload {
  listing_id:   string;
  title:        string;
  description:  string;
  category_id:  string;       // Marktplaats category ID (from int_lookup_values)
  price_cents:  number | null;
  price_type:   'FIXED' | 'NEGOTIABLE' | 'ON_REQUEST' | 'AUCTION';
  postcode:     string;
  image_urls:   string[];
  attributes:   { key: string; value: string }[];
}

const AUTH_URL  = 'https://api.marktplaats.nl/oauth/token';
const BASE_URL  = 'https://api.marktplaats.nl/v1';
const TIMEOUT   = 15_000;

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Marktplaats auth failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.access_token;
}

async function apiCall(method: string, path: string, token: string, body?: unknown): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Marktplaats API ${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function marktplaatsPublish(payload: PublishPayload, sys: any): Promise<MarktplaatsListing> {
  const clientId     = process.env.MARKTPLAATS_CLIENT_ID ?? sys?.config?.client_id;
  const clientSecret = process.env.MARKTPLAATS_CLIENT_SECRET ?? sys?.config?.client_secret;
  if (!clientId || !clientSecret) throw new Error('Marktplaats credentials not configured (MARKTPLAATS_CLIENT_ID / MARKTPLAATS_CLIENT_SECRET)');

  const token = await getToken(clientId, clientSecret);

  const body = {
    title:       payload.title,
    description: payload.description,
    category:    { id: Number(payload.category_id) },
    price: payload.price_cents !== null
      ? { type: payload.price_type, amount: payload.price_cents }
      : { type: 'ON_REQUEST' },
    location: { countryCode: 'nl', postalCode: payload.postcode || '0000AA' },
    images: payload.image_urls.map(url => ({ url })),
    attributes: payload.attributes,
  };

  const result = await apiCall('POST', '/listings', token, body);
  return {
    listingId: result?.id ?? result?.listingId,
    url: result?._links?.self?.href ?? result?.url,
  };
}

export async function marktplaatsUpdate(externalId: string, payload: Partial<PublishPayload>, sys: any): Promise<void> {
  const clientId     = process.env.MARKTPLAATS_CLIENT_ID ?? sys?.config?.client_id;
  const clientSecret = process.env.MARKTPLAATS_CLIENT_SECRET ?? sys?.config?.client_secret;
  if (!clientId || !clientSecret) throw new Error('Marktplaats credentials not configured');
  const token = await getToken(clientId, clientSecret);
  const patch: Record<string, unknown> = {};
  if (payload.title)       patch.title = payload.title;
  if (payload.description) patch.description = payload.description;
  if (payload.price_cents !== null) patch.price = { type: payload.price_type ?? 'FIXED', amount: payload.price_cents };
  await apiCall('PATCH', `/listings/${externalId}`, token, patch);
}

export async function marktplaatsDelete(externalId: string, sys: any): Promise<void> {
  const clientId     = process.env.MARKTPLAATS_CLIENT_ID ?? sys?.config?.client_id;
  const clientSecret = process.env.MARKTPLAATS_CLIENT_SECRET ?? sys?.config?.client_secret;
  if (!clientId || !clientSecret) throw new Error('Marktplaats credentials not configured');
  const token = await getToken(clientId, clientSecret);
  await apiCall('DELETE', `/listings/${externalId}`, token);
}
