import { useState, useEffect, useCallback } from 'react';
import {
  History, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Brain, Bot, Shuffle, Swords, Clock, Fuel, Target, Trophy,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';

const BACKEND = 'http://localhost:3001';

const CTRL_META = {
  ppo:    { label: 'PPO Agent',    color: 'var(--cyan)',   icon: Brain,   badge: 'badge-cyan'   },
  pid:    { label: 'PID Baseline', color: 'var(--orange)', icon: Bot,     badge: 'badge-orange' },
  random: { label: 'Random',       color: 'var(--purple)', icon: Shuffle, badge: 'badge-purple' },
};

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Mini sparkline inside a row ───────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (!data?.length) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>no step data</span>;
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="alt_km" stroke={color} strokeWidth={1.5} dot={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 6, fontSize: 11 }}
          labelFormatter={() => ''}
          formatter={(v) => [`${v} km`, 'Alt']}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Expanded detail panel ─────────────────────────────────────────────────────
function SimDetail({ simId, color }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/history/simulations/${simId}`)
      .then(r => r.json())
      .then(j => { setDetail(j.data); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, [simId]);

  if (loading) return <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading step data…</div>;
  if (err)     return <div style={{ padding: '1rem', color: '#f87171', fontSize: '0.8rem' }}>{err}</div>;
  if (!detail?.steps?.length) return <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No step data stored for this run.</div>;

  const charts = [
    { key: 'alt_km',       label: 'Altitude (km)', color },
    { key: 'reward',       label: 'Reward',         color: 'var(--green)' },
    { key: 'fuel_kg',      label: 'Fuel (kg)',       color: 'var(--orange)' },
    { key: 'batt_wh',      label: 'Battery (Wh)',    color: 'var(--purple)' },
  ];

  return (
    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
        {charts.map(({ key, label, color: c }) => (
          <div key={key} style={{ background: 'var(--bg-space)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{label.toUpperCase()}</p>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={detail.steps} margin={{ top: 0, bottom: 0, left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="step" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 6, fontSize: 11 }}
                />
                <Line type="monotone" dataKey={key} stroke={c} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Single simulation row ─────────────────────────────────────────────────────
function SimRow({ sim, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = CTRL_META[sim.controller] || CTRL_META.random;
  const Icon = meta.icon;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete simulation #${sim.id}?`)) return;
    setDeleting(true);
    try {
      await fetch(`${BACKEND}/api/history/simulations/${sim.id}`, { method: 'DELETE' });
      onDelete(sim.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      borderColor: expanded ? meta.color + '44' : undefined,
    }}>
      {/* Row header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
        style={{
          display: 'grid',
          gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr 7rem 2rem',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* ID */}
        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>
          #{sim.id}
        </span>

        {/* Controller badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className={`badge ${meta.badge}`}>
            <Icon size={10} /> {meta.label}
          </span>
        </div>

        {/* Reward */}
        <div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>REWARD</p>
          <p style={{ fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: meta.color }}>
            {sim.total_reward?.toFixed(1) ?? '—'}
          </p>
        </div>

        {/* Alt */}
        <div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>FINAL ALT</p>
          <p style={{ fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {sim.final_alt_km?.toFixed(1) ?? '—'} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>km</span>
          </p>
        </div>

        {/* Steps */}
        <div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>STEPS</p>
          <p style={{ fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {sim.steps_survived ?? '—'}<span style={{ color: 'var(--text-muted)' }}>/{sim.steps_requested}</span>
          </p>
        </div>

        {/* Date */}
        <div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>RAN AT</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fmtDate(sim.created_at)}</p>
        </div>

        {/* Delete */}
        <button
          id={`delete-sim-${sim.id}`}
          className="btn btn-danger"
          disabled={deleting}
          onClick={handleDelete}
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem' }}
        >
          <Trash2 size={12} /> {deleting ? '…' : 'Del'}
        </button>

        {/* Expand chevron */}
        {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>

      {expanded && <SimDetail simId={sim.id} color={meta.color} />}
    </div>
  );
}

// ── Comparison row ────────────────────────────────────────────────────────────
function CmpRow({ cmp }) {
  const ppoWins = (cmp.ppo_reward ?? 0) >= (cmp.pid_reward ?? 0);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
    }}>
      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>#{cmp.id}</span>

      {/* Winner badge */}
      <span className={`badge ${ppoWins ? 'badge-cyan' : 'badge-orange'}`}>
        {ppoWins ? <Brain size={10} /> : <Bot size={10} />}
        {ppoWins ? 'PPO wins' : 'PID wins'}
      </span>

      {/* Rewards */}
      <div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>PPO / PID REWARD</p>
        <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          <span style={{ color: 'var(--cyan)' }}>{cmp.ppo_reward?.toFixed(1)}</span>
          <span style={{ color: 'var(--text-muted)' }}> / </span>
          <span style={{ color: 'var(--orange)' }}>{cmp.pid_reward?.toFixed(1)}</span>
        </p>
      </div>

      {/* Steps */}
      <div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>STEPS</p>
        <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {cmp.steps_requested}
        </p>
      </div>

      {/* Seed */}
      <div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>SEED</p>
        <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {cmp.seed}
        </p>
      </div>

      {/* Date */}
      <div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>RAN AT</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fmtDate(cmp.created_at)}</p>
      </div>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.45rem',
        padding: '0.55rem 1.1rem',
        borderRadius: 'var(--radius-sm)',
        border: active ? '1px solid var(--border-glass)' : '1px solid transparent',
        background: active ? 'var(--cyan-dim)' : 'transparent',
        color: active ? 'var(--cyan)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-display)', fontSize: '0.72rem',
        fontWeight: 600, letterSpacing: '0.06em',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <Icon size={13} /> {label}
      {count !== undefined && (
        <span style={{
          marginLeft: 4, padding: '0.1rem 0.45rem',
          background: active ? 'var(--cyan-dim)' : 'var(--bg-card)',
          borderRadius: 999, fontSize: '0.65rem',
          color: active ? 'var(--cyan)' : 'var(--text-muted)',
        }}>{count}</span>
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [tab, setTab] = useState('simulations');
  const [sims, setSims] = useState([]);
  const [cmps, setCmps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setErr(null);
    Promise.all([
      fetch(`${BACKEND}/api/history/simulations`).then(r => r.json()),
      fetch(`${BACKEND}/api/history/comparisons`).then(r => r.json()),
    ])
      .then(([s, c]) => {
        setSims(s.data || []);
        setCmps(c.data || []);
        setLoading(false);
      })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = (id) => setSims(prev => prev.filter(s => s.id !== id));

  // ── Summary stat cards ──
  const totalRuns  = sims.length;
  const bestReward = sims.length ? Math.max(...sims.map(s => s.total_reward ?? -Infinity)) : null;
  const ppoWins    = cmps.filter(c => (c.ppo_reward ?? 0) >= (c.pid_reward ?? 0)).length;

  return (
    <main className="page-container animate-fade-in">
      {/* Page heading */}
      <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
        <History size={20} color="var(--cyan)" />
        <h2>Run History</h2>
        <div className="section-divider" />
        <button
          id="refresh-history-btn"
          className="btn btn-secondary"
          onClick={loadData}
          disabled={loading}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.7rem' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {err && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
          fontSize: '0.85rem' }}>
          <AlertTriangle size={16} /> {err}
        </div>
      )}

      {/* Summary stat tiles */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-tile">
          <span className="stat-label"><Clock size={11} style={{ marginRight: 4 }} />Total Runs</span>
          <span className="stat-value glow-cyan">{totalRuns}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label"><Trophy size={11} style={{ marginRight: 4 }} />Best Reward</span>
          <span className="stat-value" style={{ color: 'var(--green)' }}>{bestReward !== null ? bestReward.toFixed(1) : '—'}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label"><Swords size={11} style={{ marginRight: 4 }} />PPO vs PID Wins</span>
          <span className="stat-value">
            <span style={{ color: 'var(--cyan)' }}>{ppoWins}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}> / </span>
            <span style={{ color: 'var(--orange)' }}>{cmps.length - ppoWins}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
        <Tab active={tab === 'simulations'} onClick={() => setTab('simulations')}
          icon={Brain} label="Simulations" count={sims.length} />
        <Tab active={tab === 'comparisons'} onClick={() => setTab('comparisons')}
          icon={Swords} label="Comparisons" count={cmps.length} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} style={{ animation: 'spin-slow 1s linear infinite', marginBottom: '0.75rem' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>LOADING HISTORY…</p>
        </div>
      ) : tab === 'simulations' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sims.length === 0 ? (
            <EmptyState message="No simulation runs yet. Head to the Simulator tab to run one!" />
          ) : (
            <>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr 7rem 2rem',
                gap: '0.75rem', padding: '0.4rem 1rem',
              }}>
                {['#', 'Controller', 'Reward', 'Final Alt', 'Steps', 'Date', '', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {sims.map(s => <SimRow key={s.id} sim={s} onDelete={handleDelete} />)}
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {cmps.length === 0 ? (
            <EmptyState message="No comparison runs yet. Use the Compare tab to run PPO vs PID!" />
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr',
                gap: '0.75rem', padding: '0.4rem 1rem',
              }}>
                {['#', 'Winner', 'Rewards', 'Steps', 'Seed', 'Date'].map((h, i) => (
                  <span key={i} style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {cmps.map(c => <CmpRow key={c.id} cmp={c} />)}
            </>
          )}
        </div>
      )}
    </main>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      textAlign: 'center', padding: '3rem',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border-subtle)',
    }}>
      <History size={36} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{message}</p>
    </div>
  );
}
