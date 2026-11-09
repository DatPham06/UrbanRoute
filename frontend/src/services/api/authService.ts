import { USE_MOCK_API } from '../../config/api';
import { Account, AuthSession } from '../../types';
import { MOCK_ACCOUNTS } from '../mock/mockData';
import { apiClient } from './client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    if (USE_MOCK_API) {
      // Simulated server delay
      await new Promise((resolve) => setTimeout(resolve, 400));

      const { username, password } = credentials;

      // Mock credentials check
      if (username === 'admin' && password === 'admin123') {
        const adminUser = MOCK_ACCOUNTS.find((a) => a.username === 'admin')!;
        const session: AuthSession = {
          token: 'mock-jwt-token-admin-' + Date.now(),
          user: adminUser,
        };
        localStorage.setItem('urbanroute_jwt_token', session.token);
        localStorage.setItem('urbanroute_session_user', JSON.stringify(session.user));
        return session;
      }

      if (username === 'driver' && password === 'driver123') {
        const driverUser = MOCK_ACCOUNTS.find((a) => a.username === 'driver')!;
        const session: AuthSession = {
          token: 'mock-jwt-token-driver-' + Date.now(),
          user: driverUser,
        };
        localStorage.setItem('urbanroute_jwt_token', session.token);
        localStorage.setItem('urbanroute_session_user', JSON.stringify(session.user));
        return session;
      }

      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    // Real Spring Boot REST API
    const response = await apiClient.post<AuthSession>('/api/auth/login', credentials);
    if (response.data?.token) {
      localStorage.setItem('urbanroute_jwt_token', response.data.token);
      localStorage.setItem('urbanroute_session_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('urbanroute_jwt_token');
    localStorage.removeItem('urbanroute_session_user');
  },

  getCurrentUser(): Account | null {
    // A saved demo session cannot authenticate against the Java backend.
    if (!USE_MOCK_API && this.getToken()?.startsWith('mock-jwt-token-')) {
      this.logout();
      return null;
    }
    try {
      const data = localStorage.getItem('urbanroute_session_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('urbanroute_jwt_token');
  },
};
