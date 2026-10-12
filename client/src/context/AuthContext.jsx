import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('resolvex_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('resolvex_token') || null);
  const [loading, setLoading] = useState(true);

  // Check user profile on initial app load if token exists
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = sessionStorage.getItem('resolvex_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          sessionStorage.setItem('resolvex_user', JSON.stringify(res.data.data.user));
        } catch (err) {
          console.error('Session verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, data } = res.data;

    setToken(receivedToken);
    setUser(data.user);

    sessionStorage.setItem('resolvex_token', receivedToken);
    sessionStorage.setItem('resolvex_user', JSON.stringify(data.user));

    return data.user;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { token: receivedToken, data } = res.data;

    setToken(receivedToken);
    setUser(data.user);

    sessionStorage.setItem('resolvex_token', receivedToken);
    sessionStorage.setItem('resolvex_user', JSON.stringify(data.user));

    return data.user;
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('resolvex_token');
    sessionStorage.removeItem('resolvex_user');
  }, []);

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem('resolvex_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
