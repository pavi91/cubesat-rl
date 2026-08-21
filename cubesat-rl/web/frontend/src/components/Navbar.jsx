import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Satellite, BarChart2, Swords, Brain, Info, Menu, X, Clock, Rocket, LogIn, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/',         label: 'Dashboard',  icon: Satellite },
  { to: '/simulate', label: 'Simulator',  icon: BarChart2 },
  { to: '/compare',  label: 'Compare',    icon: Swords },
  { to: '/missions', label: 'Missions',   icon: Rocket },
  { to: '/model',    label: 'Model',      icon: Brain },
  { to: '/history',  label: 'History',    icon: Clock },
  { to: '/about',    label: 'About',      icon: Info },
];

const ROLE_COLORS = {
  admin:   'var(--orange)',
  analyst: 'var(--cyan)',
  viewer:  'var(--green)',
};

export default function Navbar() {
  const [open, setOpen]       = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { user, logout }      = useAuth();
  const navigate              = useNavigate();
  const dropRef               = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleLogout() {
    logout();
    setUserOpen(false);
    navigate('/login');
  }

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

        {/* Right side: status + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
          {/* Status badge */}
          <div style={styles.statusBadge}>
            <div style={styles.statusDot} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--green)' }}>LIVE</span>
          </div>

          {/* User menu */}
          {user ? (
            <div style={{ position: 'relative' }} ref={dropRef}>
              <button
                id="user-menu-btn"
                onClick={() => setUserOpen(v => !v)}
                style={styles.userBtn}
              >
                <div style={{ ...styles.avatar, background: ROLE_COLORS[user.role] + '33', border: `1px solid ${ROLE_COLORS[user.role]}44` }}>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: ROLE_COLORS[user.role] }}>
                    {user.username?.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.username}
                </span>
                <ChevronDown size={12} color="var(--text-muted)" style={{ transition: 'transform 0.15s', transform: userOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {userOpen && (
                <div style={styles.dropdown}>
                  <div style={styles.dropHeader}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.email}</p>
                    <span className={`badge`} style={{ marginTop: '0.3rem', background: ROLE_COLORS[user.role] + '22', color: ROLE_COLORS[user.role], border: `1px solid ${ROLE_COLORS[user.role]}44`, fontSize: '0.6rem' }}>
                      {user.role?.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.dropDivider} />
                  <button id="nav-logout-btn" style={styles.dropItem} onClick={handleLogout}>
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="nav-login-btn"
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.7rem' }}
              onClick={() => navigate('/login')}
            >
              <LogIn size={13} /> Sign In
            </button>
          )}

          {/* Mobile toggle */}
          <button style={styles.toggle} onClick={() => setOpen(o => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
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
          {user
            ? <li><button style={{ ...styles.mobileLink, border: 'none', background: 'none', cursor: 'pointer', width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}><LogOut size={16} /> Sign Out ({user.username})</button></li>
            : <li><NavLink to="/login" style={styles.mobileLink} onClick={() => setOpen(false)}><LogIn size={16} /> Sign In</NavLink></li>
          }
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
    textDecoration: 'none', flexShrink: 0,
  },
  logoIcon: { fontSize: '1.4rem' },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '0.05em',
  },
  links: {
    display: 'flex', listStyle: 'none', gap: '0.25rem', flex: 1,
    flexWrap: 'nowrap', overflow: 'hidden',
  },
  link: {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.73rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  linkActive: { color: 'var(--cyan)', background: 'var(--cyan-dim)' },
  statusBadge: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.3rem 0.7rem',
    border: '1px solid rgba(34,211,165,0.25)',
    borderRadius: 999,
    background: 'rgba(34,211,165,0.06)',
    flexShrink: 0,
  },
  statusDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 6px var(--green)',
    animation: 'pulse-cyan 1.5s infinite',
  },
  userBtn: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.3rem 0.6rem',
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  avatar: {
    width: 26, height: 26, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    width: 200,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    overflow: 'hidden',
    zIndex: 200,
    animation: 'fadeInUp 0.15s ease',
  },
  dropHeader: { padding: '0.9rem 1rem' },
  dropDivider: { height: 1, background: 'var(--border-subtle)' },
  dropItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.7rem 1rem',
    background: 'none', border: 'none',
    color: '#f87171', fontFamily: 'var(--font-display)',
    fontSize: '0.72rem', letterSpacing: '0.06em',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  toggle: {
    display: 'none', background: 'none', border: 'none',
    color: 'var(--text-primary)', cursor: 'pointer',
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
