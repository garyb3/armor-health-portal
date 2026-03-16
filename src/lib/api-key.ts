import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Generate a new API key. The raw key is returned once for the caller to
 * display/store — only the hash is persisted in the database.
 */
export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const rawKey = `ahp_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.substring(0, 12); // "ahp_" + 8 hex chars
  return { rawKey, keyHash, keyPrefix };
}

/**
 * Validate a raw API key against the database.
 * Returns the ApiKey record if valid, or null if invalid/inactive/expired.
 */
export async function validateApiKey(rawKey: string) {
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.active) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Fire-and-forget lastUsedAt update (telemetry, not critical path)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return apiKey;
}
