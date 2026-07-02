import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, login as authLogin, logout as authLogout } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionUser = getCurrentUser();
    setUser(sessionUser);
    setLoading(false);
  }, []);

  const login = async (workerId, pin) => {
    const userData = await authLogin(workerId, pin);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
