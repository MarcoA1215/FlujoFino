import * as crypto from 'crypto';

function getSecret() {
  return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'flujofinosecret').digest();
}

const IV = Buffer.alloc(16, 0);

export function encodeTenantId(tenantId: string): string {
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', getSecret(), IV);
    let encrypted = cipher.update(tenantId, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');
    return encrypted;
  } catch (e) {
    return tenantId;
  }
}

export function decodeTenantId(token: string): string {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', getSecret(), IV);
    let decrypted = decipher.update(token, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e: any) {
    throw new Error("DECODE ERROR: " + e.message);
  }
}

