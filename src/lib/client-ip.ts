/** Client IP behind Vercel. Prefer platform headers over spoofable client headers. */
export function getClientIp(request: Request | Headers): string {
  const headers = request instanceof Headers ? request : request.headers;
  const onVercel = process.env.VERCEL === "1";

  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }

  // Only trust these when the platform owns the edge (Vercel).
  if (onVercel) {
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;

    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
  }

  return "unknown";
}
