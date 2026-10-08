import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, logout as logoutRequest } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const needsSession = path.startsWith('/admin') || path.startsWith('/staff') || path === '/change-password';
    if (!needsSession) {
      setLoading(false);
      return;
    }
    getMe().then((res) => setUser(res.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutRequest(); } catch (_) { /* Session may already have expired. */ }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, role: user?.role || null, loading, login, logout }), [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
