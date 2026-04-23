import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Shield, Users, BarChart2 } from 'lucide-react'
import { RubiLogo } from '../App'
import styles from './Landing.module.css'

const FEATURES = [
  { icon: BarChart2,  title: 'Controle total',     desc: 'Veja exatamente para onde vai cada real com categorias, parcelas e histórico completo.' },
  { icon: TrendingUp, title: 'Seus investimentos',  desc: 'Acompanhe aportes, rendimentos e projeções da reserva do casal em tempo real.' },
  { icon: Users,      title: 'Feito para o casal',  desc: 'Divida despesas, compartilhe contas e tome decisões financeiras juntos.' },
  { icon: Shield,     title: 'Seguro por padrão',   desc: 'Histórico auditável, verificação de e-mail e proteção de dados desde o primeiro dia.' },
]

export default function Landing() {
  return (
    <div className={styles.root}>
      {/* ── Background geometry ── */}
      <div className={styles.grid} aria-hidden />
      <div className={styles.glow1} aria-hidden />
      <div className={styles.glow2} aria-hidden />

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <RubiLogo size={32} />
            <span className={styles.brandName}>Rubi</span>
          </div>
          <div className={styles.navLinks}>
            <Link to="/login"    className={styles.navLogin}>Entrar</Link>
            <Link to="/register" className={styles.navCta}>
              Começar grátis <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={`${styles.badge} animate-fade-up`}>
          <span className={styles.badgeDot} />
          Controle financeiro para casais
        </div>

        <h1 className={`${styles.headline} animate-fade-up delay-1`}>
          Seu dinheiro,<br />
          <span className={styles.headlineAccent}>organizado.</span>
        </h1>

        <p className={`${styles.sub} animate-fade-up delay-2`}>
          Parcelas, cartões, investimentos e reservas — tudo em um único lugar.
          Simples para usar. Poderoso para controlar.
        </p>

        <div className={`${styles.heroActions} animate-fade-up delay-3`}>
          <Link to="/register" className={styles.ctaPrimary}>
            Criar conta grátis <ArrowRight size={16} />
          </Link>
          <Link to="/login" className={styles.ctaSecondary}>
            Já tenho conta
          </Link>
        </div>

        {/* ── Mock dashboard card ── */}
        <div className={`${styles.mockCard} animate-fade-up delay-4`}>
          <div className={styles.mockBar}>
            <span className={styles.mockDot} style={{ background: '#F05252' }} />
            <span className={styles.mockDot} style={{ background: '#F59E0B' }} />
            <span className={styles.mockDot} style={{ background: '#79DD7E' }} />
          </div>
          <div className={styles.mockContent}>
            <div className={styles.mockRow}>
              <MockMiniCard label="Gasto cartão" value="R$ 1.840" color="var(--violet)" />
              <MockMiniCard label="Saldo livre"  value="R$ 2.320" color="var(--teal)"   />
              <MockMiniCard label="Investido"    value="R$ 500"   color="var(--lime)"   />
            </div>
            <div className={styles.mockChecklist}>
              {['Netflix • R$ 45', 'Condomínio • R$ 780', 'Fatura Nubank • R$ 1.840'].map((item, i) => (
                <div key={i} className={styles.mockItem}>
                  <div className={`${styles.mockCheck} ${i === 0 ? styles.mockChecked : ''}`}>
                    {i === 0 && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#0B0C10" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>}
                  </div>
                  <span style={{ color: i === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: i === 0 ? 'line-through' : 'none', fontSize: 12 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className={`${styles.featureCard} animate-fade-up`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className={styles.featureIcon}>
                <Icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span>© 2025 Rubi</span>
        <span>Feito com cuidado para o seu bolso</span>
      </footer>
    </div>
  )
}

function MockMiniCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg-overlay)', borderRadius: 8,
      padding: '10px 12px', borderTop: `2px solid ${color}`
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{value}</div>
    </div>
  )
}