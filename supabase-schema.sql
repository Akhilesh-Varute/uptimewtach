-- Full schema — safe to run on both new and existing databases (uses IF NOT EXISTS throughout)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  monitor_type TEXT NOT NULL DEFAULT 'http',
  host TEXT,
  port INTEGER,
  interval_seconds INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_url TEXT,
  keyword TEXT,
  ssl_expires_at TIMESTAMPTZ,
  ssl_days_remaining INTEGER,
  ssl_last_alerted_days INTEGER,
  heartbeat_token TEXT UNIQUE,
  heartbeat_grace_seconds INTEGER DEFAULT 300,
  heartbeat_last_pinged_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS monitor_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitor_checks_monitor_id ON monitor_checks(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_checks_checked_at ON monitor_checks(checked_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'ongoing'
);

CREATE TABLE IF NOT EXISTS status_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  custom_domain TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_page_monitors (
  status_page_id UUID REFERENCES status_pages(id) ON DELETE CASCADE,
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
  display_name TEXT,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (status_page_id, monitor_id)
);

-- Row Level Security (safe to re-run)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_page_monitors ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by our API routes)
-- No user-level policies needed since we use service role key server-side

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- New columns for existing databases (all idempotent)
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS keyword TEXT;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS ssl_expires_at TIMESTAMPTZ;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS ssl_days_remaining INTEGER;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS ssl_last_alerted_days INTEGER;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS monitor_type TEXT NOT NULL DEFAULT 'http';
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS host TEXT;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS port INTEGER;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS heartbeat_token TEXT UNIQUE;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS heartbeat_grace_seconds INTEGER DEFAULT 300;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS heartbeat_last_pinged_at TIMESTAMPTZ;
ALTER TABLE status_pages ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
