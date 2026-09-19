/** Host only, lower-case, without a leading "www." — or null when the referrer is empty, malformed or the store itself. */
export function referrerHost(referrer: string | null | undefined, ownHost: string | null | undefined): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    host = url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!host) return null;
  const own = (ownHost ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
  if (own && host === own) return null;
  return host.slice(0, 120);
}

const SEARCH_ENGINES = [/(^|\.)google\./, /(^|\.)bing\.com$/, /(^|\.)yahoo\./, /(^|\.)duckduckgo\.com$/, /(^|\.)yandex\./, /(^|\.)baidu\.com$/, /(^|\.)ecosia\.org$/];
const SOCIAL_NETWORKS = [/(^|\.)instagram\.com$/, /(^|\.)facebook\.com$/, /(^|\.)t\.co$/, /(^|\.)twitter\.com$/, /(^|\.)x\.com$/, /(^|\.)telegram\.(org|me)$/, /(^|\.)t\.me$/, /(^|\.)whatsapp\.com$/, /(^|\.)linkedin\.com$/, /(^|\.)pinterest\./, /(^|\.)aparat\.com$/, /(^|\.)eitaa\.com$/, /(^|\.)rubika\.ir$/];

export type TrafficChannel = "direct" | "search" | "social" | "referral";

export function trafficChannel(host: string | null): TrafficChannel {
  if (!host) return "direct";
  if (SEARCH_ENGINES.some((pattern) => pattern.test(host))) return "search";
  if (SOCIAL_NETWORKS.some((pattern) => pattern.test(host))) return "social";
  return "referral";
}
