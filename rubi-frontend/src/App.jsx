// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Verify } from './pages/Verify';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard'; //

// Componente que blinda as rotas privadas
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) return <div>A carregar o Rubi...</div>;
  if (!isAuthenticated) return <Navigate to="/" />;

  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Em breve protegeremos esta rota com o AuthContext */}
        <Route path="/dashboard" element={<Dashboard />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;