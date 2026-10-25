-- Visitors are recognised without cookies: a visitor id is HMAC(month salt, site + IP + user agent).
-- One random salt per calendar month (UTC); salts older than last month are deleted, after which
-- old visitor ids can no longer be linked to anyone.
CREATE TABLE salts (
  month TEXT PRIMARY KEY, -- e.g. 2026-10
  salt TEXT NOT NULL
);

-- Polar Payments: the webhook signing secret per site, and the checkout id on each payment, so a
-- visit to the return page (?checkout_id=...) links the payment to its visitor.
ALTER TABLE sites ADD COLUMN polar_webhook_secret TEXT;
ALTER TABLE payments ADD COLUMN checkout_id TEXT;
CREATE INDEX sessions_visitor_seen ON sessions (site_id, visitor_id, last_seen_at);
