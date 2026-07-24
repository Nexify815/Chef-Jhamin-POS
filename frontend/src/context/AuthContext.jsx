import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => ({
    role: localStorage.getItem('user_role'),
    name: localStorage.getItem('fullname'),
    token: localStorage.getItem('token'),
    mustChangePassword: localStorage.getItem('mustChangePassword') === 'true',
  }));

  const [menuItems, setMenuItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [extras, setExtras] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const isLoggedIn = !!user.token;

  const login = async (username, password, expectedRole) => {
    const res = await api.post('login', { username, password, expectedRole });
    if (res?.success && expectedRole && res.role !== expectedRole) {
      return { success: false, message: "Invalid credentials" };
    }
    if (res?.success) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user_role', res.role);
      localStorage.setItem('fullname', res.fullname);
      localStorage.setItem('mustChangePassword', String(!!res.mustChangePassword));
      setUser({ role: res.role, name: res.fullname, token: res.token, mustChangePassword: !!res.mustChangePassword });
      return { success: true, redirect: res.redirect, mustChangePassword: !!res.mustChangePassword };
    }
    return { success: false, message: res?.message || 'Login failed' };
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('fullname');
    localStorage.removeItem('mustChangePassword');
    setUser({ role: null, name: null, token: null, mustChangePassword: false });
  }, []);

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.post('change-password', { currentPassword, newPassword });
    if (res?.success) {
      localStorage.setItem('mustChangePassword', 'false');
      setUser(prev => ({ ...prev, mustChangePassword: false }));
    }
    return res;
  };

  const refreshData = useCallback(async () => {
    try {
      const [menuRes, ingRes, extRes, settingsRes] = await Promise.all([
        api.get('menu'),
        api.get('ingredients'),
        api.get('extras'),
        api.get('settings'),
      ]);
      setMenuItems(Array.isArray(menuRes) ? menuRes : []);
      setIngredients(Array.isArray(ingRes) ? ingRes : []);
      setExtras(Array.isArray(extRes) ? extRes : []);
      setSettings(settingsRes && typeof settingsRes === 'object' && !Array.isArray(settingsRes) && !settingsRes.success === false ? settingsRes : {});

      if (user.role === 'owner') {
        const usersRes = await api.get('users');
        setUsers(Array.isArray(usersRes) ? usersRes : []);
      } else {
        const listRes = await api.get('users/list');
        setUsers(Array.isArray(listRes) ? listRes : []);
      }
    } catch (e) {
      console.error('refreshData error:', e);
    }
  }, [user.role]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, refreshData]);

  return (
    <AuthContext.Provider value={{
      user, login, logout, isLoggedIn, loading, changePassword,
      menuItems, ingredients, extras, users, settings,
      refreshData, setMenuItems, setIngredients, setExtras, setUsers, setSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
