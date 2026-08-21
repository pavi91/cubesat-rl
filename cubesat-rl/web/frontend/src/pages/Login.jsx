import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Satellite, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [mode, setMode]         = useState('login');   // 'login' | 'register'
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
        await register(username, email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Background stars effect */}
      <div style={styles.starfield} aria-hidden="true" />

      <div style={styles.card} className="animate-fade-in">
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>🛰️</div>
          <span style={styles.logoText}>
            CubeSat<span style={{ color: 'var(--cyan)' }}>RL</span>
          </span>
        </div>
        <p style={styles.subtitle}>Mission Operations Platform</p>

        {/* Tab toggle */}
        <div style={styles.tabRow}>
          <button
            id="login-tab"
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setMode('login'); setError(null); }}
          >
            <LogIn size={13} /> Sign In
          </button>
          <button
            id="register-tab"
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
            onClick={() => { setMode('register'); setError(null); }}
          >
            <UserPlus size={13} /> Create Account
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.field}>
              <label style={styles.label} htmlFor="username">Username</label>
              <input
                id="username"
                style={styles.input}
                type="text"
                placeholder="mission_analyst"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              style={styles.input}
              type="email"
              placeholder="analyst@cubesat.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                style={{ ...styles.input, paddingRight: '2.5rem' }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            {loading
              ? 'Please wait…'
              : mode === 'login' ? <><LogIn size={14} /> Sign In</> : <><UserPlus size={14} /> Create Account</>
            }
          </button>
        </form>

        {/* Role info note */}
        {mode === 'register' && (
          <div className="info-box" style={{ marginTop: '1rem', fontSize: '0.78rem' }}>
            New accounts are created as <strong>Analyst</strong> — they can run simulations, compare controllers, and create mission profiles.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  starfield: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.06) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: 420,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-xl)',
    padding: '2.5rem 2rem',
    boxShadow: '0 0 60px rgba(0,212,255,0.08)',
    position: 'relative', zIndex: 1,
  },
  logoRow: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    justifyContent: 'center', marginBottom: '0.35rem',
  },
  logoIcon: { fontSize: '1.8rem' },
  logoText: {
    fontFamily: 'var(--font-display)', fontSize: '1.5rem',
    fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.05em',
  },
  subtitle: {
    textAlign: 'center', fontSize: '0.75rem',
    fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
    color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'uppercase',
  },
  tabRow: {
    display: 'flex', gap: '0.4rem',
    background: 'var(--bg-space)', borderRadius: 'var(--radius-md)',
    padding: '0.3rem', marginBottom: '1.25rem',
  },
  tab: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '0.4rem', padding: '0.5rem',
    border: 'none', borderRadius: 'var(--radius-sm)',
    background: 'transparent', color: 'var(--text-muted)',
    fontFamily: 'var(--font-display)', fontSize: '0.72rem',
    fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--cyan-dim)', color: 'var(--cyan)',
    boxShadow: '0 0 12px rgba(0,212,255,0.15)',
  },
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.65rem 0.9rem', marginBottom: '0.75rem',
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.83rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0.9rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: {
    fontSize: '0.65rem', fontFamily: 'var(--font-display)',
    letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase',
  },
  input: {
    background: 'var(--bg-space)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
    outline: 'none', transition: 'border-color 0.15s', width: '100%',
  },
  eyeBtn: {
    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: 0,
  },
};
