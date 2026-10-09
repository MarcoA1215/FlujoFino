import { describe, it, expect } from 'vitest';
import { isExemptFromLoginRedirect, PUBLIC_AUTH_EXEMPT_ROUTES } from './client';

describe('Public Routes Protection on 401 Interceptor', () => {
  it('debe contener las rutas públicas críticas configuradas', () => {
    expect(PUBLIC_AUTH_EXEMPT_ROUTES).toContain('/login');
    expect(PUBLIC_AUTH_EXEMPT_ROUTES).toContain('/store');
    expect(PUBLIC_AUTH_EXEMPT_ROUTES).toContain('/tienda');
    expect(PUBLIC_AUTH_EXEMPT_ROUTES).toContain('/book');
    expect(PUBLIC_AUTH_EXEMPT_ROUTES).toContain('/appointment');
  });

  it('no debe redirigir a /login cuando el cliente navega en rutas públicas del catálogo y reservas', () => {
    expect(isExemptFromLoginRedirect('/store')).toBe(true);
    expect(isExemptFromLoginRedirect('/store/mi-tienda')).toBe(true);
    expect(isExemptFromLoginRedirect('/tienda/xyz')).toBe(true);
    expect(isExemptFromLoginRedirect('/book/salon-123')).toBe(true);
    expect(isExemptFromLoginRedirect('/appointment/token-abc')).toBe(true);
    expect(isExemptFromLoginRedirect('/landing')).toBe(true);
    expect(isExemptFromLoginRedirect('/terms')).toBe(true);
    expect(isExemptFromLoginRedirect('/privacy')).toBe(true);
  });

  it('debe redirigir a /login cuando ocurre 401 en rutas privadas del panel administrativo o POS', () => {
    expect(isExemptFromLoginRedirect('/pos')).toBe(false);
    expect(isExemptFromLoginRedirect('/dashboard')).toBe(false);
    expect(isExemptFromLoginRedirect('/orders')).toBe(false);
    expect(isExemptFromLoginRedirect('/inventory')).toBe(false);
    expect(isExemptFromLoginRedirect('/settings')).toBe(false);
  });
});
