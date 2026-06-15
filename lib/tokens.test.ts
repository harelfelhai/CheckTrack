import { describe, it, expect, beforeAll } from "vitest";
import { createSigningToken, verifySigningToken } from "@/lib/tokens";

beforeAll(() => {
  process.env.TOKEN_SIGNING_SECRET = "test-secret-for-vitest-1234567890";
});

describe("signing tokens", () => {
  it("creates and verifies a token round-trip", async () => {
    const { token, jti } = await createSigningToken("10234");
    const claims = await verifySigningToken(token);
    expect(claims).not.toBeNull();
    expect(claims?.checkNumber).toBe("10234");
    expect(claims?.jti).toBe(jti);
  });

  it("rejects a tampered token", async () => {
    const { token } = await createSigningToken("10234");
    const tampered = token.slice(0, -3) + "xyz";
    expect(await verifySigningToken(tampered)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySigningToken("not-a-jwt")).toBeNull();
  });

  it("produces unique jti per token", async () => {
    const a = await createSigningToken("1");
    const b = await createSigningToken("1");
    expect(a.jti).not.toBe(b.jti);
  });
});
