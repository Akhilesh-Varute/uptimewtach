import * as crypto from "crypto";
import { getSupabaseAdmin } from "./supabase";

const PREFIX = "uw_";

/** Generate a new API key. Returns the plaintext key (shown once) and the hash to store. */
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const plaintext = PREFIX + raw;
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const prefix = plaintext.slice(0, 8);
  return { plaintext, hash, prefix };
}

/** Hash an incoming key for lookup. */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Validate an API key from the Authorization header. Returns the user_id or null. */
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

  // Update last_used_at async (fire and forget)
  getSupabaseAdmin()
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return data.user_id as string;
}
