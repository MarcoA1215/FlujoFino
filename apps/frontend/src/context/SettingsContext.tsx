import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client';
import { AuthContext } from './AuthContext';
import { applyThemeToDom, resetToDefaultTheme } from '../utils/colors';

export interface SettingsContextType {
  settings: any;
  exchangeRate: number;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: any) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  exchangeRate: 1,
  isLoading: false,
  refreshSettings: async () => {},
  updateSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('tenant_settings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const applyTenantTheme = useCallback((currentSettings: any) => {
    if (typeof document === 'undefined') return;
    if (!isAuthenticated || !user?.tenantId) {
      resetToDefaultTheme();
      return;
    }
    const primary = currentSettings?.themePrimaryColor || '#10b981';
    const header = currentSettings?.themeHeaderColor || primary;
    applyThemeToDom(primary, header);
  }, [isAuthenticated, user?.tenantId]);

  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated || !user?.tenantId) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get('/settings');
      if (res.data) {
        setSettings(res.data);
        localStorage.setItem('tenant_settings', JSON.stringify(res.data));
        applyTenantTheme(res.data);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.tenantId, applyTenantTheme]);

  const updateSettings = useCallback((newSettings: any) => {
    setSettings((prev: any) => {
      const merged = { ...prev, ...newSettings };
      localStorage.setItem('tenant_settings', JSON.stringify(merged));
      applyTenantTheme(merged);
      return merged;
    });
  }, [applyTenantTheme]);

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      refreshSettings();
    } else {
      resetToDefaultTheme();
    }
  }, [isAuthenticated, user?.tenantId, refreshSettings]);

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        updateSettings(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('settings_updated', handleSettingsUpdate);
      return () => window.removeEventListener('settings_updated', handleSettingsUpdate);
    }
  }, [updateSettings]);

  // Aplicar tema inicial solo si el usuario está autenticado en un tenant
  useEffect(() => {
    if (isAuthenticated && user?.tenantId && settings && Object.keys(settings).length > 0) {
      applyTenantTheme(settings);
    }
  }, [isAuthenticated, user?.tenantId, applyTenantTheme]);

  const exchangeRate = useMemo(() => {
    return Number(settings?.exchangeRate || settings?.effectiveExchangeRate || 1);
  }, [settings?.exchangeRate, settings?.effectiveExchangeRate]);

  const value = useMemo(
    () => ({
      settings,
      exchangeRate,
      isLoading,
      refreshSettings,
      updateSettings,
    }),
    [settings, exchangeRate, isLoading, refreshSettings, updateSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
