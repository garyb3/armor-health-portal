import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be set in production");
}

const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue && process.env.NODE_ENV !== "test") {
  console.warn(
    "[auth] WARNING: No JWT_SECRET set. Using auto-generated ephemeral secret. " +
      "All sessions will be invalidated on server restart."
  );
}

// Generate an Edge-compatible random fallback (Web Crypto API, no Node.js crypto)
function generateEphemeralSecret(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Use the configured secret, or generate a random one per-process for dev
const JWT_SECRET = new TextEncoder().encode(
  jwtSecretValue || generateEphemeralSecret()
);

const SALT_ROUNDS = 12;

/** Short-lived access token (15 minutes) */
const ACCESS_TOKEN_EXPIRY = "15m";
/** Long-lived refresh token (3 days) */
const REFRESH_TOKEN_EXPIRY = "3d";

export interface TokenPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  approved: boolean;
  emailVerified: boolean;
  tokenVersion: number;
  /**
   * Counties the user has access to. COUNTY_REP: assigned county slugs (may be []).
   * HR/ADMIN/null-role: always []. Authorization is role-first via canAccessCounty;
   * an empty array on a COUNTY_REP must NOT be treated as "all counties".
   */
  countySlugs: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Reject refresh tokens used as access tokens. Mirrors the inverse guard in
    // verifyRefreshToken — limits the blast radius of a stolen refresh cookie.
    if ((payload as Record<string, unknown>).type === "refresh") {
      console.warn("[auth] Refresh token presented as access token — rejecting");
      return null;
    }
    return payload as unknown as TokenPayload;
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      console.warn("[auth] Token expired for sub:", (error as Error & { claim?: string }).message);
    } else if (error instanceof joseErrors.JWSSignatureVerificationFailed) {
      console.warn("[auth] Token signature verification failed — possible tampering");
    } else if (error instanceof joseErrors.JWTClaimValidationFailed) {
      console.warn("[auth] Token claim validation failed:", (error as Error).message);
    } else {
      console.warn("[auth] Token verification failed:", (error as Error).message);
    }
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload as Record<string, unknown>).type !== "refresh") {
      console.warn("[auth] Expected refresh token but got access token");
      return null;
    }
    return payload as unknown as TokenPayload;
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      console.warn("[auth] Refresh token expired");
    } else {
      console.warn("[auth] Refresh token verification failed:", (error as Error).message);
    }
    return null;
  }
}

/** Cookie options for access token */
export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 15 * 60, // 15 minutes
  path: "/",
};

/** Cookie options for refresh token */
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 3, // 3 days
  path: "/",
};
