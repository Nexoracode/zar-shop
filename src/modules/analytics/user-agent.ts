import type { VisitorDevice } from "@generated/prisma/enums";

export type ParsedUserAgent = { browser: string; device: VisitorDevice; isBot: boolean };

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl\/|wget\/|python-requests|axios\/|node-fetch|go-http-client|okhttp\/|java\//i;

/**
 * Just enough User-Agent reading for the dashboard's browser/device breakdown — a handful of
 * ordered checks rather than a parsing library, since the order matters more than the coverage
 * (Edge and Opera also say "Chrome"; Chrome on iOS says "CriOS" and "Safari").
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = (userAgent ?? "").slice(0, 400);
  if (!ua || BOT_PATTERN.test(ua)) return { browser: "Other", device: "DESKTOP", isBot: true };

  const device: VisitorDevice = /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "TABLET" : /mobi|iphone|ipod|android/i.test(ua) ? "MOBILE" : "DESKTOP";

  let browser = "Other";
  if (/edg(e|a|ios)?\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser\//i.test(ua)) browser = "Samsung Internet";
  else if (/firefox\/|fxios\//i.test(ua)) browser = "Firefox";
  else if (/chrome\/|crios\//i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && /version\//i.test(ua)) browser = "Safari";
  return { browser, device, isBot: false };
}
