import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUptime(uptimePercent: number): string {
  return uptimePercent.toFixed(2) + "%";
}

export function formatResponseTime(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function getStatusColor(status: string) {
  switch (status) {
    case "up": return "text-green-500";
    case "down": return "text-red-500";
    default: return "text-gray-400";
  }
}

export function getStatusBg(status: string) {
  switch (status) {
    case "up": return "bg-green-500";
    case "down": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

export const PLAN_LIMITS = {
  free:     { monitors: 10,  interval: 300, statusPages: 1,    historyDays: 7,   webhooks: false, apiAccess: false, customDomains: false },
  starter:  { monitors: 20,  interval: 60,  statusPages: 3,    historyDays: 30,  webhooks: false, apiAccess: true,  customDomains: false },
  pro:      { monitors: 100, interval: 60,  statusPages: null, historyDays: 90,  webhooks: true,  apiAccess: true,  customDomains: true  },
  business: { monitors: 500, interval: 60,  statusPages: null, historyDays: 365, webhooks: true,  apiAccess: true,  customDomains: true  },
};
