/**
 * Shared API base URL resolution.
 *
 * `NEXT_PUBLIC_API_URL` is inlined at build time, so a value that was edited
 * after a deployment (or a value containing several comma/space separated
 * URLs) can leave the browser calling an unreachable host. A value such as
 * `http://localhost:5000` on a deployed HTTPS site is also blocked by the
 * browser as mixed content.
 *
 * This helper normalises the configured value, ignores unusable entries and
 * falls back to the production API. Browser requests are sent to the
 * same-origin `/api/*` proxy configured in `next.config.mjs`, which removes
 * CORS and mixed-content failures entirely.
 */

const PRODUCTION_API_URL = "https://fixmate-platform-server-eosin.vercel.app";
const DEVELOPMENT_API_URL = "http://localhost:5000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function normalizeCandidate(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    if (!parsed.hostname) return "";

    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return "";
  }
}

function isLocalHost(apiUrl) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(apiUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * Normalises every URL configured in `NEXT_PUBLIC_API_URL`.
 * Supports comma, whitespace and newline separated values.
 */
export function parseApiUrlCandidates(rawValue = process.env.NEXT_PUBLIC_API_URL) {
  return String(rawValue || "")
    .split(/[\s,]+/)
    .map(normalizeCandidate)
    .filter(Boolean);
}

/**
 * Resolves the backend origin used by the Next.js rewrite proxy and by
 * server-side code. In development the local backend wins; in production a
 * reachable HTTPS host wins so a stale localhost value cannot break the site.
 */
export function resolveApiOrigin(rawValue = process.env.NEXT_PUBLIC_API_URL) {
  const candidates = parseApiUrlCandidates(rawValue);
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (isDevelopment) {
    const localCandidate = candidates.find(isLocalHost);
    if (localCandidate) return localCandidate;
  }

  const remoteCandidates = candidates.filter((url) => !isLocalHost(url));
  const secureCandidate = remoteCandidates.find((url) =>
    url.startsWith("https://")
  );

  if (secureCandidate) return secureCandidate;
  if (remoteCandidates.length > 0) return remoteCandidates[0];

  return isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;
}

/**
 * Base URL used by client components.
 *
 * In the browser this is intentionally empty so requests go to `/api/*` on the
 * current origin and Next.js proxies them to the backend. That keeps working
 * on Vercel production, preview URLs and custom domains without rebuilding for
 * CORS or API URL changes.
 */
export function getApiBaseUrl() {
  if (typeof window !== "undefined") return "";
  return resolveApiOrigin();
}

/** Builds a fully-qualified API URL for the current environment. */
export function buildApiUrl(path = "") {
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path)
    : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
