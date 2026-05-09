import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fw_user')); }
    catch { return null; }
  });
  const [authMeta, setAuthMeta] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fw_auth_meta')); }
    catch { return null; }
  });

  const login = (userData, meta = {}) => {
    setUser(userData);
    localStorage.setItem('fw_user', JSON.stringify(userData));
    const normalizedMeta = {
      mode: meta.mode || 'demo',
      token: meta.token || null,
      expiresIn: meta.expiresIn || null
    };
    setAuthMeta(normalizedMeta);
    localStorage.setItem('fw_auth_meta', JSON.stringify(normalizedMeta));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fw_user');
    setAuthMeta(null);
    localStorage.removeItem('fw_auth_meta');
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    if (authMeta?.token) {
      return;
    }
    setUser(null);
    setAuthMeta(null);
    localStorage.removeItem('fw_user');
    localStorage.removeItem('fw_auth_meta');
  }, [user, authMeta]);

  return (
    <AuthContext.Provider value={{ user, authMeta, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
