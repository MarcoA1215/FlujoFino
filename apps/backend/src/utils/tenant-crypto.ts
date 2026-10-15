import * as crypto from 'crypto';

function getSecret(): Buffer {
  const secret = process.env.TENANT_CRYPTO_SECRET || process.env.JWT_SECRET;
  if (
    process.env.NODE_ENV === 'production' &&
    (!secret || secret === 'finoworksecret' || secret.length < 16)
  ) {
    console.error(
      '[ALERTA DE SEGURIDAD] JWT_SECRET o TENANT_CRYPTO_SECRET debe estar configurado con una clave robusta en producción.',
    );
  }
  return crypto.createHash('sha256').update(secret || 'finoworksecret').digest();
}

const LEGACY_IV = Buffer.alloc(16, 0);

export function encodeTenantId(tenantId: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', getSecret(), iv);
    let encrypted = cipher.update(tenantId, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');
    return `${iv.toString('hex')}.${encrypted}`;
  } catch (e) {
    return tenantId;
  }
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export function decodeTenantId(token: string): string {
  if (!token) return token;
  if (UUID_REGEX.test(token)) {
    return token;
  }

  // 1. Formato moderno con IV dinámico: iv_hex.ciphertext_base64url
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length === 2 && parts[0].length === 32) {
      try {
        const iv = Buffer.from(parts[0], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', getSecret(), iv);
        let decrypted = decipher.update(parts[1], 'base64url', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        // Fallback al intento legacy si la versión moderna falla
      }
    }
  }

  // 2. Formato legacy retrocompatible (IV estático de ceros)
  // Garantiza que ningún enlace compartido previamente por los comercios activos se rompa
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', getSecret(), LEGACY_IV);
    let decrypted = decipher.update(token, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e: any) {
    throw new Error('DECODE ERROR: ' + e.message);
  }
}


