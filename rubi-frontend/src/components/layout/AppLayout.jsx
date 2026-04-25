import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowRightLeft, TrendingUp,
  FlaskConical, Settings, LogOut, Users, HandCoins,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { RubiLogo } from '../../App'
import styles from './AppLayout.module.css'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowRightLeft,  label: 'Transações' },
  { to: '/investments',  icon: TrendingUp,       label: 'Investimentos' },
  { to: '/simulations',  icon: FlaskConical,     label: 'Simulações' },
  { to: '/loans',        icon: HandCoins,        label: 'Empréstimos' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/') }
  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <RubiLogo size={28} />
          <span className={styles.logoText}>Rubi</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          {user?.hasPartner && (
            <div className={styles.partnerBadge}>
              <Users size={12} />
              <span>Casal conectado</span>
            </div>
          )}
          <NavLink to="/settings" className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
            <Settings size={18} strokeWidth={1.75} />
            <span>Configurações</span>
          </NavLink>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name?.split(' ')[0]}</span>
              <span className={styles.userEmail}>{user?.email}</span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
