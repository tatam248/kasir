import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CashierShift, StoreSettings } from '../types/index.ts';
import { apiRequest, getToken, removeToken, setToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  activeShift: CashierShift | null;
  storeSettings: StoreSettings | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permissionCode: string) => boolean;
  refreshMe: () => Promise<void>;
  refreshActiveShift: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const refreshSettings = async () => {
    const res = await apiRequest('/settings');
    if (res.success && res.settings) {
      setStoreSettings(res.settings);
    }
  };

  const refreshActiveShift = async () => {
    if (!getToken()) return;
    const res = await apiRequest('/shifts/active');
    if (res.success) {
      setActiveShift(res.activeShift || null);
    }
  };

  const refreshMe = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
        await refreshActiveShift();
      } else {
        removeToken();
        setUser(null);
      }
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
    refreshSettings();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      await refreshActiveShift();
      return { success: true };
    }

    return { success: false, message: res.message || 'Login gagal.' };
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setActiveShift(null);
  };

  const hasPermission = (code: string): boolean => {
    if (!user) return false;
    if (user.roleCode === 'super_admin') return true;
    return user.permissions?.includes(code) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        activeShift,
        storeSettings,
        login,
        logout,
        hasPermission,
        refreshMe,
        refreshActiveShift,
        refreshSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
