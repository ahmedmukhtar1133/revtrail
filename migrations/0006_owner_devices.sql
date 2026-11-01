-- Browsers the dashboard was opened from, as a keyed hash of IP + user agent (the raw IP is never
-- stored). Tracking requests from these are not counted, so checking your own site doesn't show
-- up as visitors. Rows older than 30 days are ignored and pruned.
CREATE TABLE owner_devices (
  fp TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);
