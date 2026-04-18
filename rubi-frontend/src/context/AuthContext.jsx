
import { createContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Quando o site abre, verifica se já há um token guardado
    const token = localStorage.getItem('@Rubi:token');
    const storedUser = localStorage.getItem('@Rubi:user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  async function signIn(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token } = response.data; // ← só token vem do backend

    localStorage.setItem('@Rubi:token', token);
    // Guarda o email como identificador mínimo até ter um endpoint /me
    localStorage.setItem('@Rubi:user', JSON.stringify({ email }));

    setUser({ email });
  }

  function signOut() {
    localStorage.removeItem('@Rubi:token');
    localStorage.removeItem('@Rubi:user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}