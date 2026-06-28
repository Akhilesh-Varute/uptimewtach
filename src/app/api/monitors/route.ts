import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PLAN_LIMITS } from "@/lib/utils";
import * as crypto from "crypto";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data, error } = await getSupabaseAdmin()
    .from("monitors")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load monitors" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id, plan").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { count } = await getSupabaseAdmin()
    .from("monitors").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const limit = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.monitors ?? 10;
  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: "Monitor limit reached for " + user.plan + " plan" }, { status: 403 });
  }

  const body = await req.json();
  const { name, url, webhook_url, keyword, monitor_type, host, port, heartbeat_grace_seconds } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const type: "http" | "tcp" | "heartbeat" = monitor_type === "tcp" ? "tcp" : monitor_type === "heartbeat" ? "heartbeat" : "http";
  const interval = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.interval ?? 300;

  if (type === "heartbeat") {
    const token = crypto.randomBytes(24).toString("hex");
    const grace = parseInt(heartbeat_grace_seconds ?? "300", 10) || 300;
    const { data, error } = await getSupabaseAdmin()
      .from("monitors")
      .insert({
        user_id: user.id,
        name,
        url: "heartbeat://" + token,
        monitor_type: "heartbeat",
        interval_seconds: interval,
        heartbeat_token: token,
        heartbeat_grace_seconds: grace,
        webhook_url: webhook_url || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Failed to create monitor" }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  if (type === "tcp") {
    if (!host || !port) {
      return NextResponse.json({ error: "host and port are required for TCP monitors" }, { status: 400 });
    }
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json({ error: "Invalid port number" }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin()
      .from("monitors")
      .insert({
        user_id: user.id,
        name,
        url: "tcp://" + host + ":" + portNum,
        monitor_type: "tcp",
        host,
        port: portNum,
        interval_seconds: interval,
        webhook_url: webhook_url || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: "Failed to create monitor" }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // HTTP monitor
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  if (webhook_url) {
    try { new URL(webhook_url); } catch {
      return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
    }
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("monitors")
    .insert({
      user_id: user.id,
      name,
      url: parsedUrl.toString(),
      monitor_type: "http",
      interval_seconds: interval,
      webhook_url: webhook_url || null,
      keyword: keyword || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create monitor" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
