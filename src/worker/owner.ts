import type { Context } from 'hono';
import { clientIp } from './collect';
import type { AppEnv } from './env';

/** How long one dashboard visit keeps that browser out of the stats. */
const REMEMBER_MS = 30 * 86_400_000;

/**
 * A keyed hash of IP + browser, so the raw IP is never stored and the hash can't be reversed by
 * trying every address. Null when there is nothing to go on.
 */
async function fingerprint(c: Context<AppEnv>): Promise<string | null> {
  const ip = clientIp(c);
  const ua = c.req.header('user-agent') ?? '';
  if (!ip || !ua || !c.env.SESSION_SECRET) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(c.env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`owner|${ip}|${ua}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Called whenever the signed-in admin uses the dashboard: remember this browser as theirs. */
export async function rememberOwnerDevice(c: Context<AppEnv>) {
  const fp = await fingerprint(c);
  if (!fp) return;
  const now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO owner_devices (fp, seen_at) VALUES (?, ?) ON CONFLICT (fp) DO UPDATE SET seen_at = excluded.seen_at').bind(fp, now),
    c.env.DB.prepare('DELETE FROM owner_devices WHERE seen_at < ?').bind(now - REMEMBER_MS),
  ]);
}

/** Is this tracking request coming from a browser the admin uses the dashboard in? */
export async function isOwnerVisit(c: Context<AppEnv>): Promise<boolean> {
  const fp = await fingerprint(c);
  if (!fp) return false;
  const row = await c.env.DB.prepare('SELECT 1 FROM owner_devices WHERE fp = ? AND seen_at > ?')
    .bind(fp, Date.now() - REMEMBER_MS)
    .first();
  return !!row;
}
