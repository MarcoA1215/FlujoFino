import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import { UserRole } from '@nutrideli/shared-types';
import { Preferences } from '@capacitor/preferences';

interface User {
  id: string;
  username: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
  workspaces?: any[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, workspaces?: any[]) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (tenantId: string) => Promise<void>;
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
  };

  const switchWorkspace = async (tenantId: string) => {
    const res = await apiClient.post('/auth/select-workspace', { tenantId });
    await login(res.data.access_token, res.data.user, res.data.workspaces);
    window.location.href = '/dashboard';
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await Preferences.remove({ key: 'token' });
    await Preferences.remove({ key: 'user' });
    delete apiClient.defaults.headers.common['Authorization'];
    
    // Forzar recarga limpia para destruir todo estado local/caché al cerrar sesión
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, switchWorkspace, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
