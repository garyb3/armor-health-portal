import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_HEX = process.env.SSN_ENCRYPTION_KEY;

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
      "SSN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

/**
 * Encrypt an SSN using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (all base64-encoded).
 */
export function encryptSSN(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt an SSN that was encrypted with encryptSSN().
 * Expects the format: iv:authTag:ciphertext (all base64-encoded).
 */
export function decryptSSN(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted SSN format");
  }

  const [ivB64, authTagB64, ciphertext] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mask an SSN for display: "123-45-6789" → "***-**-6789"
 */
export function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length < 4) return "***-**-****";
  return `***-**-${digits.slice(-4)}`;
}

/**
 * Extract the last 4 digits from an SSN (any format).
 */
export function extractLastFour(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  return digits.slice(-4);
}
