import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import { UserRole } from '@finowork/shared-types';
import { Preferences } from '@capacitor/preferences';
import { offlineDb } from '../services/offline-db';

interface User {
  id: string;
  username: string;
  email?: string;
  identification?: string;
  phone?: string;
  isEmailVerified?: boolean;
  role: UserRole;
  roles?: UserRole[];
  tenantId?: string;
  tenantName?: string;
  workspaces?: any[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, workspaces?: any[]) => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (tenantId: string) => Promise<void>;
  switchMode: (targetRole: UserRole) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      const { value: storedToken } = await Preferences.get({ key: 'token' });
      const { value: storedUser } = await Preferences.get({ key: 'user' });

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      setIsLoading(false);
    };
    loadAuth();
  }, []);

  const login = async (token: string, user: User, workspaces?: any[]) => {
    const fullUserData = { ...user, workspaces: workspaces || user.workspaces };
    setToken(token);
    setUser(fullUserData);
    await Preferences.set({ key: 'token', value: token });
    await Preferences.set({ key: 'user', value: JSON.stringify(fullUserData) });
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Aislamiento Multi-Tenant:
    // Si el usuario que ingresa pertenece a un tenant diferente al último activo en este dispositivo,
    // limpiamos la memoria local y caché offline del negocio previo para evitar contaminación de datos.
    const prevTenant = localStorage.getItem('flujofino_active_tenant_id');
    const newTenant = fullUserData.tenantId || '';
    if (prevTenant && newTenant && prevTenant !== newTenant) {
      await offlineDb.clearTenantCache(prevTenant);
      localStorage.removeItem('flujofino_exchange_rate');
      localStorage.removeItem('flujofino_rate_mode');
      localStorage.removeItem('flujofino_currency_symbol');
      localStorage.removeItem('flujofino_simulating_offline');
    }
    if (newTenant) {
      localStorage.setItem('flujofino_active_tenant_id', newTenant);
    }
  };

  const updateUser = async (updatedFields: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updatedFields };
    setUser(updated);
    await Preferences.set({ key: 'user', value: JSON.stringify(updated) });
  };

  const switchWorkspace = async (tenantId: string) => {
    // Si cambia de workspace, limpiar la caché del workspace anterior
    if (user?.tenantId && user.tenantId !== tenantId) {
      await offlineDb.clearTenantCache(user.tenantId);
      localStorage.removeItem('flujofino_exchange_rate');
      localStorage.removeItem('flujofino_rate_mode');
      localStorage.removeItem('flujofino_currency_symbol');
    }

    const res = await apiClient.post('/auth/select-workspace', { tenantId });
    if (res.data.requiresApproval) {
      const info = {
        requestId: res.data.requestId,
        username: res.data.user?.username || user?.username,
        attemptTime: res.data.attemptTime,
        message: res.data.message,
      };
      localStorage.setItem('pendingAccessRequestId', res.data.requestId);
      localStorage.setItem('pendingAccessRequestInfo', JSON.stringify(info));
      setToken(null);
      setUser(null);
      await Preferences.remove({ key: 'token' });
      await Preferences.remove({ key: 'user' });
      delete apiClient.defaults.headers.common['Authorization'];
      window.location.href = '/login';
      return;
    }
    await login(res.data.access_token, res.data.user, res.data.workspaces);
    window.location.href = '/';
  };

  const switchMode = async (targetRole: UserRole) => {
    const res = await apiClient.post('/auth/switch-mode', { targetRole });
    const newToken = res.data.access_token;
    const updatedUser = res.data.user;
    const fullUserData = { ...user, ...updatedUser };
    setToken(newToken);
    setUser(fullUserData);
    await Preferences.set({ key: 'token', value: newToken });
    await Preferences.set({ key: 'user', value: JSON.stringify(fullUserData) });
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    let targetPath = '/dashboard';
    switch (targetRole) {
      case UserRole.POS:
        targetPath = '/pos';
        break;
      case UserRole.DELIVERY:
        targetPath = '/delivery-panel';
        break;
      case UserRole.INVENTORY:
        targetPath = '/raw-materials';
        break;
      case UserRole.KITCHEN:
        targetPath = '/orders';
        break;
      case UserRole.PROMOTOR:
        targetPath = '/promoter';
        break;
      case UserRole.ADMIN:
      default:
        targetPath = '/dashboard';
        break;
    }
    window.location.href = targetPath;
  };

  const logout = async () => {
    // Al cerrar sesión, limpiar caché de visualización del tenant para proteger su privacidad
    const currentTenant = user?.tenantId || localStorage.getItem('flujofino_active_tenant_id');
    if (currentTenant) {
      await offlineDb.clearTenantCache(currentTenant);
    }
    localStorage.removeItem('flujofino_active_tenant_id');
    localStorage.removeItem('flujofino_exchange_rate');
    localStorage.removeItem('flujofino_rate_mode');
    localStorage.removeItem('flujofino_currency_symbol');
    localStorage.removeItem('flujofino_simulating_offline');

    setToken(null);
    setUser(null);
    await Preferences.remove({ key: 'token' });
    await Preferences.remove({ key: 'user' });
    delete apiClient.defaults.headers.common['Authorization'];
    
    // Forzar recarga limpia para destruir todo estado local/caché al cerrar sesión
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, logout, switchWorkspace, switchMode, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
