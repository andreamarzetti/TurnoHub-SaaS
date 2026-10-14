/**
 * Public origin used for OAuth callbacks, payment return links, and webhooks.
 * Production must use the stable published domain, never the temporary dev URL.
 */
export function getPublicAppUrl(): string | null {
  const configured = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol !== "https:") return null;
      return parsed.origin;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV === "production") return null;

  const domain = (process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0];
  if (!domain) return "http://localhost:80";
  return domain.startsWith("http") ? domain.replace(/\/+$/, "") : `https://${domain}`;
}
