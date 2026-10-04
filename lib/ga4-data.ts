import crypto from "crypto";
import fs from "fs";
import path from "path";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export interface GA4Row {
  date: string;
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  engagedSessions: number;
  bounceRate: number;
  avgSessionDuration: number;
}

function b64url(input: Buffer | string): string {
  const b64 = Buffer.isBuffer(input)
    ? input.toString("base64")
    : Buffer.from(input).toString("base64");
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function makeJWT(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const sigInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(sigInput);
  return `${sigInput}.${b64url(sign.sign(sa.private_key))}`;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = makeJWT(sa);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

function loadServiceAccount(): ServiceAccount {
  const keyFile = process.env.GOOGLE_SA_KEY_FILE;
  if (keyFile) {
    try {
      const raw = fs.readFileSync(path.resolve(keyFile), "utf-8");
      return JSON.parse(raw);
    } catch {}
  }
  const keyJson = process.env.GOOGLE_SA_KEY;
  if (keyJson) return JSON.parse(keyJson);
  throw new Error(
    "No Google service account key found (GOOGLE_SA_KEY_FILE or GOOGLE_SA_KEY)"
  );
}

export async function fetchGA4Report(
  startDate: string,
  endDate: string,
  propertyId: string
): Promise<GA4Row[]> {
  const sa = loadServiceAccount();
  const token = await getAccessToken(sa);

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "screenPageViews" },
          { name: "engagedSessions" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
        dateRanges: [{ startDate, endDate }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return (json.rows ?? []).map((row: any) => {
    const dateRaw = row.dimensionValues?.[0]?.value ?? "";
    const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
    const m = row.metricValues ?? [];
    return {
      date,
      sessions: parseInt(m[0]?.value ?? "0"),
      users: parseInt(m[1]?.value ?? "0"),
      newUsers: parseInt(m[2]?.value ?? "0"),
      pageviews: parseInt(m[3]?.value ?? "0"),
      engagedSessions: parseInt(m[4]?.value ?? "0"),
      bounceRate: Math.round(parseFloat(m[5]?.value ?? "0") * 100) / 100,
      avgSessionDuration:
        Math.round(parseFloat(m[6]?.value ?? "0") * 100) / 100,
    };
  });
}
