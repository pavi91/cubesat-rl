import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND = 'http://localhost:3001';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem('cubesat_token'));
  const [loading, setLoading] = useState(true);

  // Set axios default auth header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('cubesat_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('cubesat_token');
    }
  }, [token]);

  // Verify token and load user on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get(`${BACKEND}/api/auth/me`)
      .then(r => { setUser(r.data); setLoading(false); })
      .catch(() => { setToken(null); setUser(null); setLoading(false); });
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${BACKEND}/api/auth/login`, { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await axios.post(`${BACKEND}/api/auth/register`, { username, email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
