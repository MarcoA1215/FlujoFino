// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';
import { AuthContext } from './AuthContext';
import { apiClient } from '../api/client';

describe('SettingsContext Performance & Centralized Architecture Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('permite a los componentes leer la configuración de forma síncrona desde el estado del contexto', async () => {
    const mockSettings = {
      tenantId: 'tenant-123',
      exchangeRate: 54.5,
      themePrimaryColor: '#10b981',
      enableProduction: true,
      enableReservations: false,
    };

    localStorage.setItem('tenant_settings', JSON.stringify(mockSettings));

    const mockAuthValue: any = {
      user: { tenantId: 'tenant-123', role: 'ADMIN' },
      isAuthenticated: true,
    };

    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: mockSettings });

    const ConsumerComponent = () => {
      const { settings, exchangeRate } = useSettings();
      return React.createElement(
        'div',
        null,
        React.createElement('span', { 'data-testid': 'rate' }, exchangeRate),
        React.createElement('span', { 'data-testid': 'theme' }, settings.themePrimaryColor),
        React.createElement('span', { 'data-testid': 'prod' }, settings.enableProduction ? 'ENABLED' : 'DISABLED')
      );
    };

    render(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(
          SettingsProvider,
          null,
          React.createElement(ConsumerComponent, null)
        )
      )
    );

    // Lectura síncrona inmediata desde el contexto sin esperar roundtrips de red
    expect(screen.getByTestId('rate').textContent).toBe('54.5');
    expect(screen.getByTestId('theme').textContent).toBe('#10b981');
    expect(screen.getByTestId('prod').textContent).toBe('ENABLED');
  });

  it('no dispara peticiones HTTP duplicadas al servidor al renderizar múltiples componentes o mutar el menú', async () => {
    const mockSettings = {
      tenantId: 'tenant-123',
      exchangeRate: 50.0,
      themePrimaryColor: '#059669',
    };

    const mockAuthValue: any = {
      user: { tenantId: 'tenant-123', role: 'ADMIN' },
      isAuthenticated: true,
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: mockSettings });

    // Simular múltiples componentes que consumen los ajustes simultáneamente (Menú, BottomNav, Header)
    const MenuComponent = () => {
      const { settings } = useSettings();
      return React.createElement('div', { 'data-testid': 'menu' }, settings.exchangeRate);
    };

    const BottomNavComponent = () => {
      const { settings } = useSettings();
      return React.createElement('div', { 'data-testid': 'bottom-nav' }, settings.exchangeRate);
    };

    const HeaderComponent = () => {
      const { exchangeRate } = useSettings();
      return React.createElement('div', { 'data-testid': 'header' }, exchangeRate);
    };

    let rerenderFn: any;
    await act(async () => {
      const { rerender } = render(
        React.createElement(
          AuthContext.Provider,
          { value: mockAuthValue },
          React.createElement(
            SettingsProvider,
            null,
            React.createElement(MenuComponent, null),
            React.createElement(BottomNavComponent, null),
            React.createElement(HeaderComponent, null)
          )
        )
      );
      rerenderFn = rerender;
    });

    // A pesar de que 3 componentes consumen las settings, solo se debe haber realizado 1 sola petición HTTP a /settings
    const settingsCalls = getSpy.mock.calls.filter((call) => call[0] === '/settings');
    expect(settingsCalls.length).toBe(1);

    // Simular re-render / cambio de layout o navegación del menú
    await act(async () => {
      rerenderFn(
        React.createElement(
          AuthContext.Provider,
          { value: mockAuthValue },
          React.createElement(
            SettingsProvider,
            null,
            React.createElement(MenuComponent, null),
            React.createElement('div', null, 'Layout mutado')
          )
        )
      );
    });

    // El contador de peticiones debe mantenerse en 1, previniendo peticiones duplicadas y memory leaks
    const subsequentCalls = getSpy.mock.calls.filter((call) => call[0] === '/settings');
    expect(subsequentCalls.length).toBe(1);
  });
});
