import { site } from "@/lib/site";

/**
 * Same-origin check for every route that changes something or spends money.
 *
 * A browser sends `Origin` on cross-site and on same-origin POSTs; a request
 * whose origin is not one of ours is refused before auth, so a malicious page
 * cannot drive a signed-in user's session. Accepted: the canonical site, the
 * apex, this deployment's own Vercel hosts (preview and production URLs are
 * ours too), and localhost outside production.
 */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  const isProd =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (!origin) {
    // Older clients omit Origin on same-origin requests; the fetch metadata
    // header still tells us whether the call crossed sites.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") return false;
    return true;
  }

  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);

  const allowed = new Set(
    [
      site.url,
      `https://${site.domain}`,
      `https://www.${site.domain}`,
      ...vercelHosts,
      ...(!isProd
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : []),
    ].map((value) => value.replace(/\/$/, "")),
  );

  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
