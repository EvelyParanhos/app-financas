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
      
      // Revalida o token buscando dados frescos
      api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const fresh = { id: res.data.id, name: res.data.name, email: res.data.email, partnerId: res.data.partnerId };
          localStorage.setItem('@Rubi:user', JSON.stringify(fresh));
          setUser(fresh);
        }).catch(() => {
          signOut();
        }).finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  async function signIn(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token } = response.data;
    localStorage.setItem('@Rubi:token', token);
    
    const userResponse = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const userData = {
      id: userResponse.data.id,
      name: userResponse.data.name,
      email: userResponse.data.email,
      partnerId: userResponse.data.partnerId,
      inviteCode: userResponse.data.inviteCode
    };

    localStorage.setItem('@Rubi:user', JSON.stringify(userData));
    setUser(userData);
  }

  function signOut() {
    localStorage.removeItem('@Rubi:token');
    localStorage.removeItem('@Rubi:user');
    setUser(null);
  }

  // O RETURN QUE FALTAVA PARA A TELA NÃO FICAR AMARELA!
  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}