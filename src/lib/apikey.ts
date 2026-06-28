import * as crypto from "crypto";
import { getSupabaseAdmin } from "./supabase";
import { PLAN_LIMITS } from "./utils";

const PREFIX = "uw_";

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const plaintext = PREFIX + raw;
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const prefix = plaintext.slice(0, 8);
  return { plaintext, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer uw_")) return null;
  const key = authHeader.slice("Bearer ".length);
  const hash = hashApiKey(key);

  const { data } = await getSupabaseAdmin()
    .from("api_keys")
    .select("id, user_id")
    .eq("key_hash", hash)
    .single();

  if (!data) return null;

  const { data: user } = await getSupabaseAdmin()
    .from("users")
    .select("plan")
    .eq("id", data.user_id)
    .single();

  const allowed = PLAN_LIMITS[user?.plan as keyof typeof PLAN_LIMITS]?.apiAccess ?? false;
  if (!allowed) return null;

  getSupabaseAdmin()
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return data.user_id as string;
}
