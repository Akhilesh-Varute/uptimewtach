export type WebhookEvent = "down" | "up" | "ssl_expiring";

export interface WebhookPayload {
  event: WebhookEvent;
  monitorName: string;
  url: string;
  timestamp: string;
  details?: string;
}

function buildSlackBody(p: WebhookPayload): object {
  const icon = p.event === "down" ? "🔴" : p.event === "up" ? "✅" : "⚠️";
  const title =
    p.event === "down"
      ? `${icon} *${p.monitorName}* is DOWN`
      : p.event === "up"
      ? `${icon} *${p.monitorName}* is back UP`
      : `${icon} *${p.monitorName}* SSL cert expiring`;
  const text = [title, `URL: ${p.url}`, p.details].filter(Boolean).join("\n");
  return { text };
}

function buildDiscordBody(p: WebhookPayload): object {
  const icon = p.event === "down" ? "🔴" : p.event === "up" ? "✅" : "⚠️";
  const color =
    p.event === "down" ? 0xe74c3c : p.event === "up" ? 0x2ecc71 : 0xf39c12;
  const title =
    p.event === "down"
      ? `${icon} ${p.monitorName} is DOWN`
      : p.event === "up"
      ? `${icon} ${p.monitorName} is back UP`
      : `${icon} ${p.monitorName} — SSL cert expiring`;
  const description = [p.url, p.details].filter(Boolean).join("\n");
  return {
    embeds: [{ title, description, color, timestamp: p.timestamp }],
  };
}

function buildGenericBody(p: WebhookPayload): object {
  return {
    event: p.event,
    monitor: p.monitorName,
    url: p.url,
    timestamp: p.timestamp,
    details: p.details ?? null,
  };
}

export async function sendWebhook(
  webhookUrl: string,
  payload: WebhookPayload
): Promise<void> {
  let body: object;
  if (webhookUrl.includes("hooks.slack.com")) {
    body = buildSlackBody(payload);
  } else if (webhookUrl.includes("discord.com/api/webhooks")) {
    body = buildDiscordBody(payload);
  } else {
    body = buildGenericBody(payload);
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Silently swallow — webhook errors must never break monitoring
  }
}
