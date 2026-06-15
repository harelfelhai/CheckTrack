import { SignJWT, jwtVerify } from "jose";

/**
 * Signed one-time tokens for remote signing (spec §5.א — Deep Linking & Tokens).
 * The token is a signed JWT carrying the check number + a unique id (jti).
 * One-time use is enforced separately via the store (markTokenUsed/isTokenUsed).
 */

function secret(): Uint8Array {
  const value =
    process.env.TOKEN_SIGNING_SECRET || "dev-only-insecure-secret-change-me";
  return new TextEncoder().encode(value);
}

export interface SigningTokenClaims {
  checkNumber: string;
  jti: string;
}

export async function createSigningToken(
  checkNumber: string,
): Promise<{ token: string; jti: string }> {
  const jti = crypto.randomUUID();
  const token = await new SignJWT({ checkNumber })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  return { token, jti };
}

export async function verifySigningToken(
  token: string,
): Promise<SigningTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.checkNumber !== "string" || typeof payload.jti !== "string") {
      return null;
    }
    return { checkNumber: payload.checkNumber, jti: payload.jti };
  } catch {
    return null;
  }
}
