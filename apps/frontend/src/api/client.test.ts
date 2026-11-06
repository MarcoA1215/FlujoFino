import { describe, it, expect, vi } from 'vitest';
import {
  isExemptFromLoginRedirect,
  PUBLIC_AUTH_EXEMPT_ROUTES,
  apiClient,
  invalidateApiCache,
  getApiCacheSize,
} from './client';

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

describe('Dynamic BaseURL Resolution (getBaseURL)', () => {
  it('debe identificar correctamente direcciones locales y remotas', async () => {
    const { isLocalAddress } = await import('./client');
    expect(isLocalAddress('http://localhost:3001')).toBe(true);
    expect(isLocalAddress('http://127.0.0.1:3001')).toBe(true);
    expect(isLocalAddress('http://192.168.1.50:5173')).toBe(true);
    expect(isLocalAddress('https://flujofino.onrender.com')).toBe(false);
    expect(isLocalAddress('https://finowork.com')).toBe(false);
    expect(isLocalAddress('https://finowork.vercel.app')).toBe(false);
  });

  it('debe usar el backend oficial de produccion en dominios reales o cuando VITE_API_URL esta definido', async () => {
    const { getBaseURL, PROD_API_FALLBACK } = await import('./client');
    const url = getBaseURL();
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    expect(PROD_API_FALLBACK).toContain('flujofino.onrender.com');
  });
});

describe('Smart Client Cache & Mutation Invalidation Suite', () => {
  it('debe invalidar la caché manualmente o selectivamente por patrón', () => {
    invalidateApiCache();
    expect(getApiCacheSize()).toBe(0);
  });

  it('debe retornar datos de caché y permitir deduplicación sin saturar la red', async () => {
    invalidateApiCache();

    let networkCallCount = 0;
    const mockAdapter = vi.fn().mockImplementation(async (cfg) => {
      networkCallCount++;
      return {
        data: { message: 'fresh data', count: networkCallCount },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    });

    // Petición 1: debe invocar adapter
    const res1 = await apiClient.get('/test-endpoint', { adapter: mockAdapter as any });
    expect(res1.data.message).toBe('fresh data');
    expect(networkCallCount).toBe(1);

    // Petición 2: dentro de staleTime, debe resolver desde la caché sin incrementar llamadas de red
    const res2 = await apiClient.get('/test-endpoint', { adapter: mockAdapter as any });
    expect(res2.data.message).toBe('fresh data');
    expect(networkCallCount).toBe(1);

    // Petición 3 con skipCache: true: debe forzar consulta a la red
    const res3 = await apiClient.get('/test-endpoint', { adapter: mockAdapter as any, skipCache: true });
    expect(res3.data.message).toBe('fresh data');
    expect(networkCallCount).toBe(2);
  });

  it('debe invalidar la caché automáticamente tras mutaciones (POST/PUT/DELETE)', async () => {
    invalidateApiCache();

    let networkGetCount = 0;
    const mockGetAdapter = vi.fn().mockImplementation(async (cfg) => {
      networkGetCount++;
      return {
        data: { balance: 500, version: networkGetCount },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    });

    const mockPostAdapter = vi.fn().mockImplementation(async (cfg) => {
      return {
        data: { success: true },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: cfg,
      };
    });

    // 1. Lectura inicial
    const r1 = await apiClient.get('/orders/summary', { adapter: mockGetAdapter as any });
    expect(r1.data.balance).toBe(500);
    expect(networkGetCount).toBe(1);

    // 2. Segunda lectura (en caché)
    await apiClient.get('/orders/summary', { adapter: mockGetAdapter as any });
    expect(networkGetCount).toBe(1);

    // 3. Mutación financiera (creación de orden / movimiento)
    await apiClient.post('/orders', { amount: 100 }, { adapter: mockPostAdapter as any, skipGlobalLoading: true });

    // 4. Inmediatamente después de la mutación, la caché DEBE estar limpia para garantizar datos 100% en tiempo real
    const r3 = await apiClient.get('/orders/summary', { adapter: mockGetAdapter as any });
    expect(networkGetCount).toBe(2);
    expect(r3.data.version).toBe(2);
  });
});
