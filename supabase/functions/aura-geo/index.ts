// supabase/functions/aura-geo/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * --- AURA GEO ---
 * v1.0 — where the business is, and where a login came from.
 *
 * TWO THINGS, BOTH POINTED AT THE ACCOUNT HOLDER
 *
 *   RESOLVE — turns the browser's coordinates into a country, city and
 *   district. Used so reports, tax context and currency are right without
 *   interrogating the director about their own address.
 *
 *   LOGIN CHECK — reads the caller's IP and returns its country and city, so
 *   the app can notice a sign-in from somewhere the account has never been.
 *   That is how a compromised password is caught, and it protects the person
 *   logging in rather than watching anyone.
 *
 * WHAT THIS IS NOT
 *
 * There is no lookup of arbitrary IPs or people. Not an oversight — a "locate
 * any address" endpoint inside a business system is a tracking tool with an
 * invoice attached, and it would be reachable by anyone who found the URL.
 * The IP examined here is the one making the request. Nothing else.
 *
 * ACCURACY, HONESTLY
 *
 * Browser coordinates are metres accurate with GPS and kilometres accurate
 * without. IP location is city-accurate at best and frequently wrong on
 * African mobile networks, where traffic often routes through a gateway in
 * another country entirely. So IP results carry a confidence field, and it is
 * never treated as fact — a login alert should prompt a question, never lock
 * somebody out of their own books.
 *
 * PROVIDERS: OpenStreetMap Nominatim and ipapi.co. Both free, no key. Both
 * ask for courteous use, so results are cached.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: any }>();

function cached(key: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  if (hit) cache.delete(key);
  if (cache.size > 2000) for (const [k, v] of cache) if (Date.now() - v.at > CACHE_TTL_MS) cache.delete(k);
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Coordinates to a place name. Nominatim requires an identifying User-Agent. */
async function reverseGeocode(lat: number, lng: number) {
  const key = `rev:${lat.toFixed(3)},${lng.toFixed(3)}`;   // ~100m — plenty for a district
  const hit = cached(key);
  if (hit) return hit;

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BBU1-Aura/1.0 (business operating system)', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Place lookup returned ${res.status}.`);

  const b = await res.json();
  const a = b?.address ?? {};
  const value = {
    country: a.country ?? null,
    countryCode: (a.country_code ?? '').toUpperCase() || null,
    region: a.state ?? a.region ?? null,
    district: a.county ?? a.state_district ?? a.suburb ?? null,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
    display: b?.display_name ?? null,
    source: 'device',
    confidence: 'high',
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** The requesting IP, to a city. Never an IP supplied by the caller. */
async function locateRequestIp(ip: string) {
  const key = `ip:${ip}`;
  const hit = cached(key);
  if (hit) return hit;

  const res = await fetch(`https://ipapi.co/${ip}/json/`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`IP lookup returned ${res.status}.`);

  const b = await res.json();
  if (b?.error) throw new Error(String(b.reason ?? 'IP lookup failed.'));

  const value = {
    ip,
    country: b.country_name ?? null,
    countryCode: b.country_code ?? null,
    region: b.region ?? null,
    city: b.city ?? null,
    org: b.org ?? null,
    source: 'ip',
    // Mobile carriers in this region often route through a gateway in another
    // country. Treating that as the user's location locks people out of their
    // own accounts, so it is labelled rather than trusted.
    confidence: 'low',
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'resolve').toLowerCase();

    if (action === 'resolve') {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('lat and lng are required.');
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error('Those coordinates are not on Earth.');
      return json({ success: true, place: await reverseGeocode(lat, lng) });
    }

    if (action === 'login_check') {
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
        || req.headers.get('cf-connecting-ip')
        || '';
      if (!ip) return json({ success: false, error: 'The caller IP could not be read.' });

      const here = await locateRequestIp(ip);

      // The comparison is deliberately left to the caller, which holds the
      // last known country per device. Storing a location history server-side
      // would mean building a record of everywhere every director has ever
      // signed in from — a bigger liability than the problem it solves.
      const known = String(body.knownCountryCode ?? '').toUpperCase();
      const unexpected = !!(known && here.countryCode && known !== here.countryCode);

      return json({
        success: true,
        location: here,
        unexpected,
        advice: unexpected
          ? `This sign-in appears to come from ${here.country ?? 'another country'}, while the last one was from ${known}. IP location is unreliable on mobile networks, so ask before acting — but if the director has not travelled, change the password.`
          : null,
      });
    }

    throw new Error(`Unknown action "${action}". Use "resolve" or "login_check".`);

  } catch (error) {
    console.error('[AURA GEO]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});