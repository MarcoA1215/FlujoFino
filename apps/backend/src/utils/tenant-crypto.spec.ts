import * as crypto from 'crypto';
import { encodeTenantId, decodeTenantId, isValidUUID } from './tenant-crypto';

describe('tenant-crypto utility', () => {
  const sampleTenantId = '123e4567-e89b-12d3-a456-426614174000';

  it('debe codificar y decodificar correctamente un tenantId con formato moderno', () => {
    const encoded = encodeTenantId(sampleTenantId);
    expect(encoded).toContain('.');
    expect(encoded).not.toBe(sampleTenantId);

    const decoded = decodeTenantId(encoded);
    expect(decoded).toBe(sampleTenantId);
  });

  it('dos codificaciones del mismo tenantId deben producir ciphertexts distintos gracias al IV dinámico', () => {
    const encoded1 = encodeTenantId(sampleTenantId);
    const encoded2 = encodeTenantId(sampleTenantId);

    expect(encoded1).not.toBe(encoded2);
    expect(decodeTenantId(encoded1)).toBe(sampleTenantId);
    expect(decodeTenantId(encoded2)).toBe(sampleTenantId);
  });

  it('debe decodificar tokens legacy generados con IV estático sin romper enlaces existentes', () => {
    // Generar un token con el algoritmo legacy (IV de ceros)
    const secret = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'finoworksecret').digest();
    const legacyIv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', secret, legacyIv);
    let legacyToken = cipher.update(sampleTenantId, 'utf8', 'base64url');
    legacyToken += cipher.final('base64url');

    expect(legacyToken).not.toContain('.');

    const decoded = decodeTenantId(legacyToken);
    expect(decoded).toBe(sampleTenantId);
  });

  it('debe permitir UUIDs directos para compatibilidad interna o de pruebas', () => {
    expect(decodeTenantId(sampleTenantId)).toBe(sampleTenantId);
  });

  it('debe validar correctamente si un string es UUID válido', () => {
    expect(isValidUUID(sampleTenantId)).toBe(true);
    expect(isValidUUID('admin-system')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('debe lanzar error controlado si el token está completamente corrupto', () => {
    expect(() => decodeTenantId('not-a-valid-token-at-all!!')).toThrow('DECODE ERROR');
  });
});
