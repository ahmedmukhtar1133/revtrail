import { randomId } from './crypto';

const enc = new TextEncoder();
export const SESSION_MS = 30 * 60_000;

const saltCache = new Map<string, string>();

function monthOf(now: number) {
  return new Date(now).toISOString().slice(0, 7);
}

/** This month's salt, created on first use. Salts older than last month are deleted. */
async function monthSalt(db: D1Database, now: number): Promise<string> {
  const month = monthOf(now);
  const hit = saltCache.get(month);
  if (hit) return hit;
  await db.prepare('INSERT OR IGNORE INTO salts (month, salt) VALUES (?, ?)').bind(month, randomId(32)).run();
  const row = await db.prepare('SELECT salt FROM salts WHERE month = ?').bind(month).first<{ salt: string }>();
  const lastMonth = monthOf(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth() - 1, 1));
  await db.prepare('DELETE FROM salts WHERE month < ?').bind(lastMonth).run();
  saltCache.clear();
  saltCache.set(month, row!.salt);
  return row!.salt;
}

/**
 * The visitor's id, with nothing stored in the browser: a keyed hash of the site, IP address and user
 * agent. The key changes every month, so the same person gets a new id each month and the IP address
 * itself is never stored.
 */
export async function visitorId(db: D1Database, siteId: string, ip: string, ua: string, now: number): Promise<string> {
  const salt = await monthSalt(db, now);
  const key = await crypto.subtle.importKey('raw', enc.encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${siteId}|${ip}|${ua}`)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The visitor's current visit (seen in the last 30 minutes), or a new visit id. */
export async function sessionId(db: D1Database, siteId: string, vid: string, now: number): Promise<{ id: string; existing: boolean }> {
  const row = await db
    .prepare('SELECT id FROM sessions WHERE site_id = ? AND visitor_id = ? AND last_seen_at > ? ORDER BY last_seen_at DESC LIMIT 1')
    .bind(siteId, vid, now - SESSION_MS)
    .first<{ id: string }>();
  return row ? { id: row.id, existing: true } : { id: randomId(12), existing: false };
}
