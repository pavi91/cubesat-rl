import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Satellite, BarChart2, Swords, Brain, Info, Menu, X, Clock } from 'lucide-react';

const links = [
  { to: '/',         label: 'Dashboard',  icon: Satellite },
  { to: '/simulate', label: 'Simulator',  icon: BarChart2 },
  { to: '/compare',  label: 'Compare',    icon: Swords },
  { to: '/model',    label: 'Model',      icon: Brain },
  { to: '/history',  label: 'History',    icon: Clock },
  { to: '/about',    label: 'About',      icon: Info },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <NavLink to="/" style={styles.logo}>
          <div style={styles.logoIcon}>🛰️</div>
          <span style={styles.logoText}>CubeSat<span style={{ color: 'var(--cyan)' }}>RL</span></span>
        </NavLink>

        {/* Desktop Links */}
        <ul style={styles.links}>
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.linkActive : {}),
              })}>
                <Icon size={14} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Status badge */}
        <div style={styles.statusBadge}>
          <div style={styles.statusDot} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--green)' }}>LIVE</span>
        </div>

        {/* Mobile toggle */}
        <button style={styles.toggle} onClick={() => setOpen(o => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <ul style={styles.mobileMenu}>
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} style={({ isActive }) => ({
                ...styles.mobileLink,
                ...(isActive ? styles.linkActive : {}),
              })} onClick={() => setOpen(false)}>
                <Icon size={16} /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(5,10,20,0.85)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  inner: {
    maxWidth: 1400, margin: '0 auto',
    padding: '0 1.5rem',
    height: 60,
    display: 'flex', alignItems: 'center', gap: '2rem',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    textDecoration: 'none',
  },
  logoIcon: { fontSize: '1.4rem' },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '0.05em',
  },
  links: {
    display: 'flex', listStyle: 'none', gap: '0.25rem', flex: 1,
  },
  link: {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.78rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
  },
  linkActive: {
    color: 'var(--cyan)',
    background: 'var(--cyan-dim)',
  },
  statusBadge: {
    marginLeft: 'auto',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.3rem 0.7rem',
    border: '1px solid rgba(34,211,165,0.25)',
    borderRadius: 999,
    background: 'rgba(34,211,165,0.06)',
  },
  statusDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 6px var(--green)',
    animation: 'pulse-cyan 1.5s infinite',
  },
  toggle: {
    display: 'none', background: 'none', border: 'none',
    color: 'var(--text-primary)', cursor: 'pointer',
    '@media (max-width: 700px)': { display: 'block' },
  },
  mobileMenu: {
    listStyle: 'none',
    padding: '0.5rem 1.5rem 1rem',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
  },
  mobileLink: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.6rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
  },
};
