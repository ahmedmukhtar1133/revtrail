// Fills the LOCAL database with 30 days of fake traffic so you can see the dashboard.
// Usage: node scripts/seed-demo.mjs && npx wrangler d1 execute revtrail --local --file .wrangler/seed.sql
import { mkdirSync, writeFileSync } from 'node:fs';

const DAY = 86_400_000;
const now = Date.now();
const siteId = 'demo0001';
let seed = 2026;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () => Math.floor(rand() * 16).toString(16));

const SOURCES = [
  [{ source: 'X', channel: 'Organic Social', referrer: 't.co', domain: 't.co' }, 24],
  [{ source: 'Direct/None', channel: 'Direct', referrer: null, domain: null }, 20],
  [{ source: 'Google', channel: 'Organic Search', referrer: 'www.google.com', domain: 'google.com' }, 16],
  [{ source: 'Hacker News', channel: 'Referral', referrer: 'news.ycombinator.com', domain: 'news.ycombinator.com' }, 8],
  [{ source: 'Reddit', channel: 'Organic Social', referrer: 'www.reddit.com/r/macapps', domain: 'reddit.com' }, 7],
  [{ source: 'ChatGPT', channel: 'AI', referrer: 'chatgpt.com', domain: 'chatgpt.com' }, 5],
  [{ source: 'Fazier', channel: 'Referral', referrer: 'fazier.com', domain: 'fazier.com' }, 4],
  [{ source: 'AlternativeTo', channel: 'Referral', referrer: 'alternativeto.net', domain: 'alternativeto.net' }, 4],
  [{ source: 'YouTube', channel: 'Organic Social', referrer: 'www.youtube.com', domain: 'youtube.com' }, 3],
  [{ source: 'Bluesky', channel: 'Organic Social', referrer: 'bsky.app', domain: 'bsky.app' }, 2],
  [{ source: 'Claude', channel: 'AI', referrer: 'claude.ai', domain: 'claude.ai' }, 2],
  [{ source: 'Perplexity', channel: 'AI', referrer: 'www.perplexity.ai', domain: 'perplexity.ai' }, 2],
];
const CAMPAIGNS = { X: ['launch-thread', 'demo-video', 'founder-story'], Reddit: ['macapps-post'], YouTube: ['review-video'] };
const PAGES = ['/', '/', '/', '/pricing', '/blog/best-note-apps-for-mac', '/blog/markdown-vs-rich-text', '/features', '/download', '/changelog', '/about'];
const COUNTRIES = [['US', 'California', 'Los Angeles'], ['US', 'Texas', 'Austin'], ['GB', 'England', 'Manchester'], ['DE', 'Bavaria', 'Munich'], ['PK', 'Punjab', 'Lahore'], ['AE', 'Dubai', 'Dubai'], ['AU', 'New South Wales', 'Sydney'], ['JP', 'Tokyo', 'Tokyo'], ['SE', 'Stockholm', 'Stockholm'], ['CA', 'British Columbia', 'Vancouver'], ['NL', 'Utrecht', 'Utrecht'], ['BR', 'Rio de Janeiro', 'Rio de Janeiro']];
const DEVICES = [[['Safari', 'Mac OS', 'Desktop'], 34], [['Chrome', 'Mac OS', 'Desktop'], 30], [['Mobile Safari', 'iOS', 'Mobile'], 16], [['Arc', 'Mac OS', 'Desktop'], 6], [['Chrome', 'Windows', 'Desktop'], 6], [['Firefox', 'Mac OS', 'Desktop'], 5], [['Chrome', 'Android', 'Mobile'], 3]];
const NAMES = ['Hana Sato', 'Omar Farooq', 'Elena Novak', 'Marcus Webb', 'Zara Malik', 'Tom Lindqvist', 'Nadia Haddad', 'Diego Ramos', 'Ines Moreau', 'Kenji Watanabe', 'Sara Ahmed', 'Ben Carter', 'Leila Rahimi', 'Owen Price'];

const out = [];
out.push(`DELETE FROM events WHERE site_id = '${siteId}';`, `DELETE FROM sessions WHERE site_id = '${siteId}';`, `DELETE FROM visitors WHERE site_id = '${siteId}';`, `DELETE FROM payments WHERE site_id = '${siteId}';`, `DELETE FROM funnels WHERE site_id = '${siteId}';`, `DELETE FROM sites WHERE id = '${siteId}';`);
out.push(`INSERT INTO sites (id, name, domain, timezone, currency, api_key, created_at) VALUES ('${siteId}', 'Notelane', 'notelane.example', 'UTC', 'USD', 'rt_demo_key', ${now - 60 * DAY});`);
out.push(`INSERT INTO funnels (id, site_id, name, steps, created_at) VALUES ('fun00001', '${siteId}', 'Landing → Checkout', ${q(JSON.stringify([{ type: 'page', value: '/' }, { type: 'page', value: '/pricing' }, { type: 'goal', value: 'checkout_click' }]))}, ${now});`);

let payN = 0;
for (let d = 34; d >= 0; d--) {
  const spike = d === 9 ? 3.2 : d === 24 ? 1.8 : 1;
  const sessionsToday = Math.round((120 + rand() * 90 + Math.sin(d / 2) * 40) * spike);
  for (let i = 0; i < sessionsToday; i++) {
    const start = now - d * DAY - Math.floor(rand() * DAY);
    if (start > now) continue;
    const src = weighted(SOURCES);
    const s = d === 9 && rand() < 0.6 ? SOURCES[0][0] : src;
    const vid = uuid(), sid = uuid();
    const [country, region, city] = pick(COUNTRIES);
    const [browser, os, device] = weighted(DEVICES);
    const camp = CAMPAIGNS[s.source] && rand() < 0.7 ? pick(CAMPAIGNS[s.source]) : null;
    const entry = s.source === 'Google' ? pick(['/blog/best-note-apps-for-mac', '/blog/markdown-vs-rich-text', '/']) : s.source === 'Reddit' ? '/blog/markdown-vs-rich-text' : pick(PAGES.slice(0, 5));
    const bounce = rand() < 0.62;
    const pages = [entry];
    if (!bounce) for (let k = 0, n = 1 + Math.floor(rand() * 4); k < n; k++) pages.push(pick(PAGES));
    const wantsToBuy = !bounce && rand() < (s.channel === 'Direct' ? 0.05 : s.source === 'X' ? 0.045 : 0.03);
    if (wantsToBuy && !pages.includes('/pricing')) pages.push('/pricing');
    const duration = bounce ? Math.floor(rand() * 25_000) : Math.floor(20_000 + rand() * 300_000);
    let t = start;
    const events = pages.map((p) => {
      const e = [t, 'pageview', null, p];
      t += Math.floor(duration / pages.length);
      return e;
    });
    if (!bounce && rand() < 0.25) events.push([t, 'goal', 'signup_click', pages.at(-1)]);
    if (wantsToBuy) events.push([t + 1000, 'goal', 'checkout_click', '/pricing'], [t + 2000, 'outbound', 'https://buy.polar.sh/polar_cl_notelane_pro', '/pricing']);
    else if (!bounce && rand() < 0.1) events.push([t, 'outbound', pick(['https://github.com/notelane', 'https://x.com/notelane', 'https://www.youtube.com/@notelane']), pages.at(-1)]);
    const goals = events.filter((e) => e[1] === 'goal').length;
    const last = Math.min(now, events.at(-1)[0] + 5000);

    const paid = wantsToBuy && rand() < 0.75;
    const name = paid ? pick(NAMES) : null;
    out.push(`INSERT INTO visitors (site_id, id, first_seen, name, email) VALUES ('${siteId}', '${vid}', ${start - (paid && rand() < 0.5 ? Math.floor(rand() * 10 * DAY) : 0)}, ${q(name)}, ${q(name ? name.toLowerCase().replace(' ', '.') + '@example.com' : null)});`);
    out.push(
      `INSERT INTO sessions (site_id, id, visitor_id, started_at, last_seen_at, duration, pageviews, goals, hostname, entry_page, exit_page, referrer, referrer_domain, source, channel, utm_source, utm_medium, utm_campaign, utm_term, utm_content, ref, country, region, city, browser, os, device) VALUES ('${siteId}', '${sid}', '${vid}', ${start}, ${last}, ${duration}, ${pages.length}, ${goals}, 'notelane.example', ${q(entry)}, ${q(pages.at(-1))}, ${q(s.referrer)}, ${q(s.domain)}, ${q(s.source)}, ${q(s.channel)}, ${q(camp ? s.source.toLowerCase() : null)}, ${q(camp ? 'social' : null)}, ${q(camp)}, NULL, NULL, NULL, '${country}', ${q(region)}, ${q(city)}, '${browser}', '${os}', '${device}');`,
    );
    for (const [ts, type, n, p] of events) out.push(`INSERT INTO events (site_id, session_id, visitor_id, ts, type, name, path) VALUES ('${siteId}', '${sid}', '${vid}', ${ts}, '${type}', ${q(n)}, ${q(p)});`);
    if (paid) {
      const amount = pick([1900, 2900, 2900, 4900, 9900]);
      out.push(`INSERT INTO payments (id, site_id, provider, ts, amount, kind, currency, visitor_id, session_id, customer_id, email, name) VALUES ('ord_demo_${++payN}', '${siteId}', 'polar', ${t + 60_000 > now ? now - 1000 : t + 60_000}, ${amount}, 'payment', 'USD', '${vid}', '${sid}', 'cus_${payN}', ${q(name.toLowerCase().replace(' ', '.') + '@example.com')}, ${q(name)});`);
    }
  }
}
// A few people online right now
for (let i = 0; i < 3; i++) {
  const vid = uuid(), sid = uuid();
  out.push(`INSERT INTO visitors (site_id, id, first_seen) VALUES ('${siteId}', '${vid}', ${now - 60_000});`);
  out.push(`INSERT INTO sessions (site_id, id, visitor_id, started_at, last_seen_at, duration, pageviews, goals, hostname, entry_page, exit_page, referrer_domain, source, channel, country, browser, os, device) VALUES ('${siteId}', '${sid}', '${vid}', ${now - 90_000}, ${now - 20_000}, 60000, 2, 0, 'notelane.example', '/', '/pricing', 't.co', 'X', 'Organic Social', 'US', 'Chrome', 'Mac OS', 'Desktop');`);
}

mkdirSync('.wrangler', { recursive: true });
writeFileSync('.wrangler/seed.sql', out.join('\n'));
console.log(`Wrote .wrangler/seed.sql (${out.length} statements, ${payN} payments)`);
