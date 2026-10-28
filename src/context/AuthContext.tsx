import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (emailOrData: string | Partial<User>, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexa_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.warn('Failed reading saved auth user:', e);
    }
    // Default initial demo user if never explicitly logged out
    const hasLoggedOut = localStorage.getItem('nexa_has_logged_out');
    if (!hasLoggedOut) {
      return {
        id: 'usr_1',
        name: 'Saniya',
        email: 'saniyalinkedin613@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        role: 'AI & Software Developer'
      };
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nexa_auth_token');
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Sync theme with HTML root class
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const saveSession = (u: User, t?: string) => {
    setUser(u);
    if (t) setToken(t);
    try {
      localStorage.setItem('nexa_auth_user', JSON.stringify(u));
      localStorage.removeItem('nexa_has_logged_out');
      if (t) localStorage.setItem('nexa_auth_token', t);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  const login = async (
    emailOrData: string | Partial<User>,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (typeof emailOrData === 'string') {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailOrData, password: password || '' })
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          saveSession(data.user, data.token);
          return { success: true };
        }
        return { success: false, error: data.error || 'Invalid credentials' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error signing in' };
      }
    } else {
      // Direct object / legacy
      const userObj: User = {
        id: emailOrData?.id || `usr_${Date.now()}`,
        name: emailOrData?.name || 'User',
        email: emailOrData?.email || 'user@nexa.ai',
        avatar: emailOrData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: emailOrData?.role || 'Productivity Member'
      };
      saveSession(userObj, 'token_' + Date.now());
      return { success: true };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        saveSession(data.user, data.token);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error creating account' };
    }
  };

  const loginDemo = async () => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.user) {
        saveSession(data.user, data.token);
      }
    } catch (e) {
      console.error('Failed demo login:', e);
      // Fallback
      saveSession({
        id: 'usr_1',
        name: 'Saniya',
        email: 'saniyalinkedin613@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        role: 'AI & Software Developer'
      });
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('nexa_auth_user');
      localStorage.removeItem('nexa_auth_token');
      localStorage.setItem('nexa_has_logged_out', 'true');
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.warn('Logout localStorage error:', e);
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    saveSession(updated, token || undefined);
    try {
      await fetch('/api/auth/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      }).catch(() => {});
    } catch {}
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        loginDemo,
        logout,
        updateUser: updateUserProfile,
        updateUserProfile,
        theme,
        toggleTheme
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
