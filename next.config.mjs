const PRODUCTION_API_URL = "https://fixmate-platform-server-eosin.vercel.app";
const DEVELOPMENT_API_URL = "http://localhost:5000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

// Keep in sync with `resolveApiOrigin` in `src/utils/api.js`. The resolver is
// duplicated here so the config stays a standalone ESM module.
function resolveApiOrigin(rawValue = process.env.NEXT_PUBLIC_API_URL) {
  const candidates = String(rawValue || "")
    .split(/[\s,]+/)
    .map((value) => {
      const trimmed = value.trim();
      if (!trimmed) return "";

      try {
        const parsed = new URL(
          /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
        );
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return "";
        }
        if (!parsed.hostname) return "";
        return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(
          /\/+$/,
          ""
        )}`;
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  const isLocal = (value) => {
    try {
      return LOCAL_HOSTNAMES.has(new URL(value).hostname);
    } catch {
      return false;
    }
  };

  const isDevelopment = process.env.NODE_ENV !== "production";

  if (isDevelopment) {
    const localCandidate = candidates.find(isLocal);
    if (localCandidate) return localCandidate;
  }

  const remoteCandidates = candidates.filter((url) => !isLocal(url));
  const secureCandidate = remoteCandidates.find((url) =>
    url.startsWith("https://")
  );

  if (secureCandidate) return secureCandidate;
  if (remoteCandidates.length > 0) return remoteCandidates[0];

  return isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    // Proxy browser requests to the backend through this deployment. This
    // avoids CORS/mixed-content failures on Vercel preview and custom domains.
    const apiOrigin = resolveApiOrigin();

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
