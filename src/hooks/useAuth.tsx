'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { authService } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAdminMode: (enabled: boolean) => Promise<void>;
  updateProfile: (data: {
    city?: string;
    bio?: string;
    profilePicture?: File | null;
    sports: { sport_id: number; skill_level: 'beginner' | 'intermediate' | 'advanced' }[];
  }) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  city?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Controleer of gebruiker al ingelogd is bij laden pagina
    if (authService.isLoggedIn()) {
      authService
        .getUser()
        .then(setUser)
        .catch(() => authService.clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token } = await authService.login(email, password);
    authService.saveToken(token);
    setUser(user);
  };

  const register = async (data: RegisterData) => {
    const { user, token } = await authService.register(data);
    authService.saveToken(token);
    setUser(user);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      authService.clearToken();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const nextUser = await authService.getUser();
    setUser(nextUser);
  };

  const setAdminMode = async (enabled: boolean) => {
    const nextUser = await authService.setAdminMode(enabled);
    setUser(nextUser);
  };

  const updateProfile = async (data: {
    city?: string;
    bio?: string;
    profilePicture?: File | null;
    sports: { sport_id: number; skill_level: 'beginner' | 'intermediate' | 'advanced' }[];
  }) => {
    const nextUser = await authService.updateProfile(data);
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setAdminMode, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
