import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function makeSvg(label: string, status: "up" | "down" | "pending"): string {
  const colors: Record<string, string> = {
    up: "#22c55e",
    down: "#ef4444",
    pending: "#6b7280",
  };
  const statusText: Record<string, string> = {
    up: "up",
    down: "down",
    pending: "checking",
  };

  const color = colors[status] ?? colors.pending;
  const rightText = statusText[status] ?? "unknown";

  // Rough pixel widths (Verdana 11px)
  const labelWidth = Math.max(label.length * 6.5 + 10, 40);
  const rightWidth = rightText.length * 7 + 14;
  const totalWidth = labelWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + rightWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${labelWidth + rightWidth / 2}" y="14">${rightText}</text>
  </g>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: monitor } = await getSupabaseAdmin()
    .from("monitors")
    .select("name, status")
    .eq("id", id)
    .single();

  if (!monitor) {
    const svg = makeSvg("monitor", "pending");
    return new NextResponse(svg, {
      status: 404,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }

  const svg = makeSvg(monitor.name, monitor.status as "up" | "down" | "pending");

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
