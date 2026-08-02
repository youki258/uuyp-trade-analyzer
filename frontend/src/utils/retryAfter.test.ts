import { describe, expect, it } from "vitest";
import { parseRetryAfterSeconds } from "./retryAfter";

describe("parseRetryAfterSeconds", () => {
  it("prefers a valid Retry-After response header", () => {
    const response = new Response(null, { headers: { "Retry-After": "7" } });

    expect(parseRetryAfterSeconds(response, { retryAfterSeconds: 3 })).toBe(7);
  });

  it("falls back to the JSON retryAfterSeconds field", () => {
    const response = new Response(null, { headers: { "Retry-After": "invalid" } });

    expect(parseRetryAfterSeconds(response, { retryAfterSeconds: 4 })).toBe(4);
  });

  it("returns undefined for missing or invalid retry metadata", () => {
    const response = new Response();

    expect(parseRetryAfterSeconds(response, { retryAfterSeconds: "4" })).toBeUndefined();
    expect(parseRetryAfterSeconds(response, null)).toBeUndefined();
  });
});
