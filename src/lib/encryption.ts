import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/** Key registry — add new keys here when rotating. */
function getKeyMap(): Map<number, Buffer> {
  const map = new Map<number, Buffer>();

  // Current key (version 1)
  const key1Hex = process.env.SSN_ENCRYPTION_KEY;
  if (key1Hex && key1Hex.length === 64) {
    map.set(1, Buffer.from(key1Hex, "hex"));
  }

  // Add future rotated keys here:
  // const key2Hex = process.env.SSN_ENCRYPTION_KEY_V2;
  // if (key2Hex && key2Hex.length === 64) map.set(2, Buffer.from(key2Hex, "hex"));

  return map;
}

/** The version used for new encryptions. Bump this when you rotate keys. */
const CURRENT_KEY_VERSION = 1;

function getKey(version: number): Buffer {
  const map = getKeyMap();
  const key = map.get(version);
  if (!key) {
    throw new Error(
      `SSN encryption key version ${version} not found. ` +
        "SSN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return key;
}

/**
 * Validate that a string looks like a valid SSN (9 digits, with or without dashes).
 */
function validateSSN(ssn: string): void {
  const digits = ssn.replace(/[\s-]/g, "");
  if (!/^\d{9}$/.test(digits)) {
    throw new Error("Invalid SSN format: must contain exactly 9 digits");
  }
  // Reject known-invalid SSNs (000, 666, 900-999 area numbers)
  const area = parseInt(digits.substring(0, 3), 10);
  if (area === 0 || area === 666 || area >= 900) {
    throw new Error("Invalid SSN: area number is not valid");
  }
  // Reject zero group or serial
  const group = parseInt(digits.substring(3, 5), 10);
  const serial = parseInt(digits.substring(5, 9), 10);
  if (group === 0 || serial === 0) {
    throw new Error("Invalid SSN: group or serial number cannot be zero");
  }
}

/**
 * Encrypt an SSN using AES-256-GCM.
 * Returns a versioned string: v<version>:iv:authTag:ciphertext (all base64-encoded).
 */
export function encryptSSN(plaintext: string): string {
  validateSSN(plaintext);

  const key = getKey(CURRENT_KEY_VERSION);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return `v${CURRENT_KEY_VERSION}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt an SSN that was encrypted with encryptSSN().
 * Supports both legacy format (iv:authTag:ciphertext) and versioned format (v<n>:iv:authTag:ciphertext).
 */
export function decryptSSN(encrypted: string): string {
  const parts = encrypted.split(":");

  let keyVersion: number;
  let ivB64: string;
  let authTagB64: string;
  let ciphertext: string;

  if (parts.length === 4 && parts[0].startsWith("v")) {
    // Versioned format: v1:iv:authTag:ciphertext
    keyVersion = parseInt(parts[0].substring(1), 10);
    ivB64 = parts[1];
    authTagB64 = parts[2];
    ciphertext = parts[3];
  } else if (parts.length === 3) {
    // Legacy format (pre-versioning): iv:authTag:ciphertext — assume version 1
    keyVersion = 1;
    ivB64 = parts[0];
    authTagB64 = parts[1];
    ciphertext = parts[2];
  } else {
    throw new Error("Invalid encrypted SSN format");
  }

  const key = getKey(keyVersion);
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if an encrypted SSN uses the current key version.
 * Useful for identifying records that need re-encryption after key rotation.
 */
export function needsReEncryption(encrypted: string): boolean {
  const parts = encrypted.split(":");
  if (parts.length === 3) return true; // Legacy format, always needs re-encryption
  if (parts.length === 4 && parts[0].startsWith("v")) {
    return parseInt(parts[0].substring(1), 10) !== CURRENT_KEY_VERSION;
  }
  return false;
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
