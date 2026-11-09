import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isAdmin as checkIsAdmin, isDriver as checkIsDriver } from '../config/roles';
import { authService, LoginCredentials } from '../services/api/authService';
import { Account, AuthSession } from '../types';

interface AuthContextType {
  currentUser: Account | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    const token = authService.getToken();
    if (user && token) {
      setCurrentUser(user);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const session = await authService.login(credentials);
      setCurrentUser(session.user);
      return session;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  const isAuthenticated = !!currentUser;
  const isAdmin = checkIsAdmin(currentUser?.role);
  const isDriver = checkIsDriver(currentUser?.role);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isDriver,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
