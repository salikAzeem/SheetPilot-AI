import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IUserProfile, ISubscriptionInfo } from '../services/api';

interface AuthContextType {
  user: IUserProfile | null;
  subscription: ISubscriptionInfo | null;
  isGoogleConnected: boolean;
  loading: boolean;
  login: (token: string, user: IUserProfile) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUserProfile | null>(null);
  const [subscription, setSubscription] = useState<ISubscriptionInfo | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const login = (token: string, userData: IUserProfile) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSubscription(null);
    setIsGoogleConnected(false);
    window.location.href = '/auth/login';
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.getProfile();
      setUser(data.user);
      setSubscription(data.subscription);
      setIsGoogleConnected(data.isGoogleConnected);
    } catch (err) {
      console.error('Session validation failed, logging out...', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, subscription, isGoogleConnected, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
