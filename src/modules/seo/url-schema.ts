import { z } from "zod";

// SEO rule URLs are entered by the admin and compared in `src/proxy.ts` against
// `req.nextUrl.pathname`. We accept either a site-relative path ("/old-page") or a full URL
// and normalise to a path before storing, so matching is a plain string compare.

const MAX = 500;

export function normalizeToPath(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return (url.pathname + url.search).replace(/\/$/, "") || "/";
    } catch {
      return trimmed;
    }
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 ? withSlash.replace(/\/$/, "") : withSlash;
}

// Source side (a route on this site) — always stored as a path.
export const seoPathSchema = z.string().trim().min(1).max(MAX)
  .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
    message: "نشانی باید یک مسیر نسبی (مثل /page) یا آدرس کامل https باشد.",
  })
  .transform(normalizeToPath);

// Target side (redirect/canonical destination) — a path on this site or an external URL.
export const seoTargetSchema = z.string().trim().min(1).max(MAX)
  .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
    message: "مقصد باید یک مسیر نسبی (مثل /page) یا آدرس کامل https باشد.",
  })
  .transform((value) => (/^https?:\/\//i.test(value) ? value.trim() : normalizeToPath(value)));

export const seoNoindexInputSchema = z.object({ url: seoPathSchema });
export const seoGoneInputSchema = z.object({ url: seoPathSchema });
export const seoCanonicalInputSchema = z.object({ sourceUrl: seoPathSchema, targetUrl: seoTargetSchema })
  .refine((value) => value.sourceUrl !== value.targetUrl, { message: "نشانی مبدأ و مقصد یکسان است.", path: ["targetUrl"] });
export const seoRedirectInputSchema = z.object({ fromUrl: seoPathSchema, toUrl: seoTargetSchema })
  .refine((value) => value.fromUrl !== value.toUrl, { message: "نشانی مبدأ و مقصد یکسان است.", path: ["toUrl"] });

export const seoDeleteByPathSchema = z.object({ url: seoPathSchema });
export const seoCanonicalDeleteSchema = z.object({ sourceUrl: seoPathSchema });
export const seoRedirectDeleteSchema = z.object({ fromUrl: seoPathSchema });
