import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Landing   from './pages/Landing'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Verify    from './pages/Verify'
import Onboarding from './pages/Onboarding'
import AppLayout  from './components/layout/AppLayout'
import Dashboard  from './pages/Dashboard'
import Simulations from './pages/Simulations'
import Investments from './pages/Investments'
import Transactions from './pages/Transactions'
import Settings   from './pages/Settings'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (user)    return <Navigate to="/dashboard" replace />
  return children
}

function SplashScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-base)'
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
      }}>
        <RubiLogo size={48} />
        <div style={{
          width: 32, height: 2, background: 'var(--lime)',
          animation: 'shimmer 1.2s linear infinite',
          backgroundImage: 'linear-gradient(90deg, var(--lime) 0%, var(--teal) 50%, var(--lime) 100%)',
          backgroundSize: '200% 100%',
          borderRadius: 99,
        }} />
      </div>
    </div>
  )
}

export function RubiLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#CAF729"/>
      <path d="M10 10h12a8 8 0 0 1 0 16H10V10Z" fill="#0B0C10"/>
      <path d="M22 26l8 4" stroke="#0B0C10" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"        element={<Landing />} />
      <Route path="/login"   element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify"  element={<Verify />} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

      {/* App */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="investments"  element={<Investments />} />
        <Route path="simulations"  element={<Simulations />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}