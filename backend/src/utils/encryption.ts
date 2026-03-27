import crypto from 'crypto';
import { logger } from '../utils/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended

// Master KEK (Key Encryption Key) from environment
const MASTER_KEY = Buffer.from(
  process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-change-in-production-32bytes',
  'utf8'
).slice(0, 32);

// Blind index key for searchable encryption
const SEARCH_INDEX_KEY = Buffer.from(
  process.env.SEARCH_INDEX_KEY || 'default-search-key-change-in-production',
  'utf8'
);

/**
 * Generate a new random DEK (Data Encryption Key) for an organization
 */
export function generateDEK(): Buffer {
  return crypto.randomBytes(32); // 256-bit key
}

/**
 * Encrypt DEK with master KEK
 */
export function encryptDEK(dek: Buffer): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt DEK with master KEK
 */
export function decryptDEK(
  ciphertext: string,
  iv: string,
  authTag: string
): Buffer {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    MASTER_KEY,
    Buffer.from(iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  
  return decrypted;
}

/**
 * Encrypt data with DEK (returns base64 encoded)
 */
export function encryptField(
  plaintext: string,
  dek: Buffer
): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext, 'utf8')),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt field');
  }
}

/**
 * Decrypt data with DEK
 */
export function decryptField(
  ciphertext: string,
  iv: string,
  authTag: string,
  dek: Buffer
): string {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      dek,
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt field');
  }
}

/**
 * Create blind index for searchable encrypted fields
 * Uses deterministic HMAC for searching without revealing plaintext
 */
export function createBlindIndex(term: string): string {
  const normalized = term.toLowerCase().trim();
  return crypto
    .createHmac('sha256', SEARCH_INDEX_KEY)
    .update(normalized)
    .digest('hex');
}

/**
 * Encrypt multiple fields at once
 */
export function encryptFields(
  fields: Record<string, string>,
  dek: Buffer
): Record<string, { ciphertext: string; iv: string; authTag: string }> {
  const encrypted: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      encrypted[key] = encryptField(value, dek);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt multiple fields at once
 */
export function decryptFields(
  fields: Record<string, { ciphertext: string; iv: string; authTag: string }>,
  dek: Buffer
): Record<string, string> {
  const decrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value && value.ciphertext && value.iv && value.authTag) {
      try {
        decrypted[key] = decryptField(value.ciphertext, value.iv, value.authTag, dek);
      } catch (error) {
        logger.error(`Failed to decrypt field ${key}:`, error);
        decrypted[key] = '[Decryption Failed]';
      }
    }
  }
  
  return decrypted;
}

/**
 * Encrypt JSON data
 */
export function encryptJSON(
  data: any,
  dek: Buffer
): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const json = JSON.stringify(data);
  return encryptField(json, dek);
}

/**
 * Decrypt JSON data
 */
export function decryptJSON(
  ciphertext: string,
  iv: string,
  authTag: string,
  dek: Buffer
): any {
  const json = decryptField(ciphertext, iv, authTag, dek);
  return JSON.parse(json);
}

/**
 * Secure comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
}

/**
 * Generate encryption key from password (for BYOK scenarios)
 */
export function deriveKeyFromPassword(
  password: string,
  salt: Buffer,
  iterations: number = 100000
): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
}

/**
 * Get or create DEK for organization
 */
export async function getOrCreateOrgDEK(
  orgId: string,
  prisma: any
): Promise<Buffer> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      dataKeyEncrypted: true,
      dataKeyIv: true,
      dataKeyTag: true,
    },
  });
  
  if (!org) {
    throw new Error('Organization not found');
  }
  
  // If DEK exists, decrypt and return it
  if (org.dataKeyEncrypted && org.dataKeyIv && org.dataKeyTag) {
    return decryptDEK(org.dataKeyEncrypted, org.dataKeyIv, org.dataKeyTag);
  }
  
  // Generate new DEK
  const dek = generateDEK();
  const encrypted = encryptDEK(dek);
  
  // Store encrypted DEK
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      dataKeyEncrypted: encrypted.ciphertext,
      dataKeyIv: encrypted.iv,
      dataKeyTag: encrypted.authTag,
    },
  });
  
  logger.info(`Generated new DEK for organization: ${orgId}`);
  
  return dek;
}

// Cache for DEKs (in production, use Redis)
const dekCache = new Map<string, { dek: Buffer; timestamp: number }>();
const DEK_CACHE_TTL = 3600000; // 1 hour

/**
 * Get DEK with caching
 */
export async function getCachedOrgDEK(
  orgId: string,
  prisma: any
): Promise<Buffer> {
  const cached = dekCache.get(orgId);
  
  if (cached && Date.now() - cached.timestamp < DEK_CACHE_TTL) {
    return cached.dek;
  }
  
  const dek = await getOrCreateOrgDEK(orgId, prisma);
  dekCache.set(orgId, { dek, timestamp: Date.now() });
  
  return dek;
}

/**
 * Clear DEK cache (call on key rotation)
 */
export function clearDEKCache(orgId?: string): void {
  if (orgId) {
    dekCache.delete(orgId);
  } else {
    dekCache.clear();
  }
}
