
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
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data; // Ajusta conforme o retorno do teu Spring Boot

      localStorage.setItem('@Rubi:token', token);
      localStorage.setItem('@Rubi:user', JSON.stringify(user));

      setUser(user);
    } catch (error) {
      console.error("Erro no login", error);
      throw error;
    }
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