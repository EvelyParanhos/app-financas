
import { createContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('@Rubi:token');
    const storedUser = localStorage.getItem('@Rubi:user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Revalida o token buscando dados frescos do usuário
      api.get('/users/me').then(res => {
        const fresh = { id: res.data.id, name: res.data.name, email: res.data.email };
        localStorage.setItem('@Rubi:user', JSON.stringify(fresh));
        setUser(fresh);
      }).catch(() => {
        // Token expirado — faz logout silencioso
        localStorage.removeItem('@Rubi:token');
        localStorage.removeItem('@Rubi:user');
        setUser(null);
      });
    }
    setLoading(false);
  }, []);

  async function signIn(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token } = response.data;

    localStorage.setItem('@Rubi:token', token);
    
    // Busca os dados reais do usuário com o token recém recebido
    const userResponse = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const userData = {
      id: userResponse.data.id,
      name: userResponse.data.name,
      email: userResponse.data.email,
    };

    localStorage.setItem('@Rubi:user', JSON.stringify(userData));
    setUser(userData);
  };
}