import "server-only";

export function auditRequestContext(request: Request, details: Record<string, unknown> = {}) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = forwarded || request.headers.get("x-real-ip") || null;
  const url = new URL(request.url);
  return {
    ipAddress,
    metadata: {
      ...details,
      request: {
        method: request.method,
        path: url.pathname,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
      },
    },
  };
}
