/** Client IP behind Vercel. Prefer platform headers over spoofable XFF. */
export function getClientIp(request: Request | Headers): string {
  const headers =
    request instanceof Headers ? request : request.headers;

  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // Last resort: only trust XFF when running on Vercel (platform-controlled).
  if (process.env.VERCEL === "1") {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
  }

  return "unknown";
}
