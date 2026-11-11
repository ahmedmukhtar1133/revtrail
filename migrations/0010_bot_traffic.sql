-- Automated traffic that passes the user-agent check (headless Chrome in cloud datacenters).
-- sessions.bot holds the reason (NULL = a person); events.bot is 1 for events of such visits.
-- The dashboard hides flagged rows; they stay in the database so they can be inspected.
ALTER TABLE sessions ADD COLUMN bot TEXT;
ALTER TABLE events ADD COLUMN bot INTEGER NOT NULL DEFAULT 0;

-- Rows from before network detection existed (no network name was stored): visits that never spent a
-- second on the page, from the cities where every visit so far came from a cloud datacenter or a crawler.
UPDATE sessions SET bot = 'history: datacenter city'
WHERE duration = 0
  AND city IN ('Ashburn', 'Beijing', 'Santa Clara', 'Centreville', 'Council Bluffs', 'Leesburg', 'Clifton', 'Washington', 'San Jose');

UPDATE events SET bot = 1
WHERE EXISTS (SELECT 1 FROM sessions s WHERE s.site_id = events.site_id AND s.id = events.session_id AND s.bot IS NOT NULL);
