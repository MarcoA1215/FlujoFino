import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import { UserRole } from '@nutrideli/shared-types';

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
  login: (token: string, user: User, workspaces?: any[]) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, user: User, workspaces?: any[]) => {
    const fullUserData = { ...user, workspaces: workspaces || user.workspaces };
    setToken(token);
    setUser(fullUserData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(fullUserData));
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
