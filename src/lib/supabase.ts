import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type Monitor = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  interval_seconds: number;
  is_active: boolean;
  status: "pending" | "up" | "down";
  last_checked_at: string | null;
  created_at: string;
};

export type MonitorCheck = {
  id: string;
  monitor_id: string;
  status: "up" | "down";
  response_time_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
};

export type Incident = {
  id: string;
  monitor_id: string;
  started_at: string;
  resolved_at: string | null;
  status: "ongoing" | "resolved";
};

export type StatusPage = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string;
  created_at: string;
};

export type User = {
  id: string;
  clerk_id: string;
  email: string;
  plan: "free" | "starter" | "pro" | "business";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

// Lazy singletons — only initialized on first call
let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

export function getSupabase(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _anon;
}
