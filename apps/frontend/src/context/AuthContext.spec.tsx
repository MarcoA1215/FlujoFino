// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContext } from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from './AuthContext';
import { Preferences } from '@capacitor/preferences';
import { apiClient } from '../api/client';
import { UserRole } from '@finowork/shared-types';

vi.mock('@capacitor/preferences', () => {
  const store: Record<string, string> = {};
  return {
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({ value: store[key] || null })),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        store[key] = value;
      }),
      remove: vi.fn(async ({ key }: { key: string }) => {
        delete store[key];
      }),
      clear: vi.fn(async () => {
        for (const k of Object.keys(store)) delete store[k];
      }),
    },
  };
});

describe('AuthContext - Gestión de Sesión, Capacitor Preferences y Workspaces', () => {
  const originalLocation = window.location;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await (Preferences as any).clear();
    delete apiClient.defaults.headers.common['Authorization'];

    // Mock seguro de window.location para interceptar redirecciones
    delete (window as any).location;
    window.location = { ...originalLocation, href: '/' } as any;
  });

  const ConsumerComponent = () => {
    const { user, token, isAuthenticated, isLoading, login, logout, switchWorkspace } = useContext(AuthContext);

    return (
      <div>
        <span data-testid="loading">{isLoading ? 'LOADING' : 'READY'}</span>
        <span data-testid="auth">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</span>
        <span data-testid="username">{user?.username || 'NO_USER'}</span>
        <span data-testid="tenant">{user?.tenantId || 'NO_TENANT'}</span>
        <span data-testid="token">{token || 'NO_TOKEN'}</span>

        <button
          data-testid="login-btn"
          onClick={() =>
            login(
              'token-jwt-123',
              {
                id: 'u-1',
                username: 'carlos',
                role: UserRole.ADMIN,
                tenantId: 'tenant-restaurante',
              },
            )
          }
        >
          Login
        </button>

        <button data-testid="logout-btn" onClick={() => logout()}>
          Logout
        </button>

        <button data-testid="switch-btn" onClick={() => switchWorkspace('tenant-sucursal-2')}>
          Switch
        </button>
      </div>
    );
  };

  it('debe iniciar como anónimo y listo cuando no hay credenciales persistidas en Preferences', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>,
      );
    });

    expect(screen.getByTestId('loading').textContent).toBe('READY');
    expect(screen.getByTestId('auth').textContent).toBe('ANONYMOUS');
    expect(screen.getByTestId('username').textContent).toBe('NO_USER');
    expect(screen.getByTestId('token').textContent).toBe('NO_TOKEN');
  });

  it('debe hidratar la sesión automáticamente desde Preferences al montar la aplicación', async () => {
    const storedUser = {
      id: 'u-persisted',
      username: 'maria_admin',
      role: UserRole.ADMIN,
      tenantId: 'tenant-cafeteria',
    };
    await Preferences.set({ key: 'token', value: 'token-stored-abc' });
    await Preferences.set({ key: 'user', value: JSON.stringify(storedUser) });

    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>,
      );
    });

    expect(screen.getByTestId('auth').textContent).toBe('AUTHENTICATED');
    expect(screen.getByTestId('username').textContent).toBe('maria_admin');
    expect(screen.getByTestId('tenant').textContent).toBe('tenant-cafeteria');
    expect(screen.getByTestId('token').textContent).toBe('token-stored-abc');
    expect(apiClient.defaults.headers.common['Authorization']).toBe('Bearer token-stored-abc');
  });

  it('debe actualizar estado, persistir en Preferences y configurar headers de Axios al hacer login', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>,
      );
    });

    expect(screen.getByTestId('auth').textContent).toBe('ANONYMOUS');

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('auth').textContent).toBe('AUTHENTICATED');
    expect(screen.getByTestId('username').textContent).toBe('carlos');
    expect(screen.getByTestId('tenant').textContent).toBe('tenant-restaurante');
    expect(screen.getByTestId('token').textContent).toBe('token-jwt-123');

    // Verificar llamada de persistencia a Capacitor Preferences
    expect(Preferences.set).toHaveBeenCalledWith({ key: 'token', value: 'token-jwt-123' });
    expect(apiClient.defaults.headers.common['Authorization']).toBe('Bearer token-jwt-123');
  });

  it('debe destruir el estado, borrar Preferences y remover Authorization header al hacer logout', async () => {
    // Iniciar logueado
    await Preferences.set({ key: 'token', value: 'token-logged' });
    await Preferences.set({
      key: 'user',
      value: JSON.stringify({ id: 'u-1', username: 'juan', role: UserRole.POS }),
    });

    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>,
      );
    });

    expect(screen.getByTestId('auth').textContent).toBe('AUTHENTICATED');

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('auth').textContent).toBe('ANONYMOUS');
    expect(screen.getByTestId('username').textContent).toBe('NO_USER');
    expect(screen.getByTestId('token').textContent).toBe('NO_TOKEN');

    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'token' });
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'user' });
    expect(apiClient.defaults.headers.common['Authorization']).toBeUndefined();
    expect(window.location.href).toBe('/login');
  });

  it('debe cambiar de workspace activo consultando al servidor y actualizando credenciales', async () => {
    // Estado inicial en tenant-1
    await Preferences.set({ key: 'token', value: 'token-t1' });
    await Preferences.set({
      key: 'user',
      value: JSON.stringify({ id: 'u-1', username: 'carlos', role: UserRole.ADMIN, tenantId: 'tenant-1' }),
    });

    // Mock respuesta de cambio de workspace
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        access_token: 'new-token-t2',
        user: { id: 'u-1', username: 'carlos', role: UserRole.ADMIN, tenantId: 'tenant-sucursal-2' },
        workspaces: [{ tenantId: 'tenant-sucursal-2', name: 'Sucursal 2' }],
      },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>,
      );
    });

    await act(async () => {
      screen.getByTestId('switch-btn').click();
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/select-workspace', {
      tenantId: 'tenant-sucursal-2',
    });
    expect(screen.getByTestId('token').textContent).toBe('new-token-t2');
    expect(screen.getByTestId('tenant').textContent).toBe('tenant-sucursal-2');
    expect(apiClient.defaults.headers.common['Authorization']).toBe('Bearer new-token-t2');
    expect(window.location.href).toBe('/');
  });
});
