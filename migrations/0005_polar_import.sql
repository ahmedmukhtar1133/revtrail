-- Polar import: an organization access token (scope orders:read) per site, so orders paid before the
-- webhook was connected, and any the webhook missed, are fetched from the Polar API.
ALTER TABLE sites ADD COLUMN polar_access_token TEXT;
ALTER TABLE sites ADD COLUMN polar_synced_at INTEGER;
