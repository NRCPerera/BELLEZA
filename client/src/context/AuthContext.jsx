import { createContext, useContext, useState, useEffect } from 'react';
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
    getMe().then((res) => setUser(res.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try { await logoutRequest(); } catch (_) { /* Session may already have expired. */ }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
