export function parseRetryAfterSeconds(
  response: Response,
  payload: unknown,
): number | undefined {
  const headerValue = Number(response.headers.get("Retry-After"));
  if (Number.isFinite(headerValue) && headerValue > 0) {
    return Math.ceil(headerValue);
  }

  if (!payload || typeof payload !== "object") return undefined;
  const bodyValue = (payload as { retryAfterSeconds?: unknown }).retryAfterSeconds;
  if (typeof bodyValue !== "number" || !Number.isFinite(bodyValue) || bodyValue <= 0) {
    return undefined;
  }
  return Math.ceil(bodyValue);
}
