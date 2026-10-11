
import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('stayease_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() =>
    localStorage.getItem('stayease_admin_token')
  );

  const [loading, setLoading] = useState(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('stayease_admin_token');
    localStorage.removeItem('stayease_admin_user');
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('stayease_admin_token');

      if (savedToken) {
        try {
          const profile = await authService.getMe();

          if (profile?.role !== 'admin') {
            logout();
          } else {
            setUser(profile);
          }
        } catch (error) {
          logout();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);

    const loggedInUser = data?.user;
    const accessToken =
      data?.accessToken ??
      data?.tokens?.accessToken ??
      data?.tokens?.access_token;

    if (!loggedInUser) {
      throw new Error('The login response did not contain user details.');
    }

    if (loggedInUser.role !== 'admin') {
      throw new Error('Access denied. Administrator privileges required.');
    }

    if (!accessToken) {
      throw new Error(
        'Login succeeded, but the access token was not found. Check the backend response format.'
      );
    }

    setToken(accessToken);
    setUser(loggedInUser);

    localStorage.setItem('stayease_admin_token', accessToken);
    localStorage.setItem(
      'stayease_admin_user',
      JSON.stringify(loggedInUser)
    );

    return loggedInUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(token) && user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}