import { useState, useCallback } from 'react';
import { Swords, Play, Trophy, Fuel, Navigation, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts';

const BACKEND = 'http://localhost:3001';

function mergeTrajectories(ppo, pid) {
  const len = Math.max(ppo?.length || 0, pid?.length || 0);
  const out = [];
  for (let i = 0; i < len; i++) {
    out.push({
      step: (ppo[i] || pid[i]).step,
      ppo_alt:    ppo[i]?.alt_km,
      pid_alt:    pid[i]?.alt_km,
      ppo_reward: ppo[i]?.cumulative_reward,
      pid_reward: pid[i]?.cumulative_reward,
      ppo_fuel:   ppo[i]?.fuel_kg,
      pid_fuel:   pid[i]?.fuel_kg,
    });
  }
  return out;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', marginBottom: '0.3rem' }}>STEP {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: '0.75rem', fontFamily: 'var(--font-display)' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function CompareChart({ data, title, ppoKey, pidKey, refY, refLabel }) {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="step" stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)' }} />
          {refY !== undefined && <ReferenceLine y={refY} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value: refLabel, fill: 'var(--text-muted)', fontSize: 9 }} />}
          <Line type="monotone" dataKey={ppoKey} name="PPO Agent" stroke="var(--cyan)"   dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey={pidKey} name="PID Baseline" stroke="var(--orange)" dot={false} strokeWidth={2} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Compare() {
  const [steps, setSteps] = useState(200);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setStatus('loading');
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setResult(data);
      setStatus('done');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [steps]);

  const merged = result ? mergeTrajectories(result.ppo?.trajectory, result.pid?.trajectory) : [];
  const ppoWins = result && result.ppo?.summary.total_reward > result.pid?.summary.total_reward;
  const fuelSaved = result
    ? Math.max(0, ((result.pid?.summary.fuel_consumed - result.ppo?.summary.fuel_consumed) / (result.pid?.summary.fuel_consumed || 0.0001)) * 100)
    : null;

  return (
    <main className="page-container">
      <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
        <Swords size={20} color="var(--orange)" />
        <h2>Head-to-Head Comparison</h2>
        <div className="section-divider" />
      </div>

      {/* Config */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            EVALUATION STEPS: {steps} (≈{(steps * 60 / 3600).toFixed(1)}h)
          </p>
          <input type="range" min={50} max={500} step={50} value={steps}
            onChange={e => setSteps(Number(e.target.value))}
            disabled={status === 'loading'}
            style={{ width: '100%', accentColor: 'var(--cyan)' }} />
        </div>
        <button className="btn btn-primary" onClick={run} disabled={status === 'loading'}>
          {status === 'loading' ? '⏳ Running...' : <><Play size={14} /> Run Comparison</>}
        </button>
      </div>

      {status === 'loading' && (
        <div className="info-box" style={{ marginBottom: '1.5rem' }}>
          🛰️ Running PPO agent then PID baseline... this takes ~30 seconds as Python loads and simulates both trajectories.
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ color: '#f87171' }}>Error: {error}. Make sure the backend is running.</p>
        </div>
      )}

      {result && (
        <>
          {/* Verdict */}
          <div style={{
            marginBottom: '1.5rem', padding: '1.5rem',
            background: ppoWins ? 'var(--cyan-dim)' : 'var(--orange-dim)',
            border: `1px solid ${ppoWins ? 'rgba(0,212,255,0.3)' : 'rgba(255,107,53,0.3)'}`,
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          }}>
            <Trophy size={32} color={ppoWins ? 'var(--cyan)' : 'var(--orange)'} />
            <div>
              <h3 style={{ color: ppoWins ? 'var(--cyan)' : 'var(--orange)', marginBottom: '0.25rem' }}>
                {ppoWins ? '🧠 PPO Agent Wins!' : '🤖 PID Baseline Wins!'}
              </h3>
              <p style={{ fontSize: '0.85rem' }}>
                {ppoWins
                  ? `PPO scored ${(result.ppo.summary.total_reward - result.pid.summary.total_reward).toFixed(1)} more reward points and saved ${fuelSaved?.toFixed(1)}% fuel.`
                  : `PID scored ${(result.pid.summary.total_reward - result.ppo.summary.total_reward).toFixed(1)} more reward points.`}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid-2" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
            {['ppo', 'pid'].map(ctrl => {
              const s = result[ctrl]?.summary;
              const color = ctrl === 'ppo' ? 'var(--cyan)' : 'var(--orange)';
              const label = ctrl === 'ppo' ? 'PPO Agent 🧠' : 'PID Baseline 🤖';
              return (
                <div key={ctrl} className="card" style={{ borderColor: color }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ color }}>{label}</h3>
                    {ctrl === (ppoWins ? 'ppo' : 'pid') && <Trophy size={16} color={color} />}
                  </div>
                  <div className="grid-2" style={{ gap: '0.5rem' }}>
                    <div className="stat-tile">
                      <span className="stat-label">Total Reward</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{s?.total_reward.toFixed(1)}</span>
                    </div>
                    <div className="stat-tile">
                      <span className="stat-label">Final Altitude</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{s?.final_alt_km.toFixed(1)}<span className="stat-unit">km</span></span>
                    </div>
                    <div className="stat-tile">
                      <span className="stat-label">Fuel Used</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{(s?.fuel_consumed * 1000).toFixed(1)}<span className="stat-unit">g</span></span>
                    </div>
                    <div className="stat-tile">
                      <span className="stat-label">Steps</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{s?.steps_survived}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CompareChart data={merged} title="ALTITUDE (km)" ppoKey="ppo_alt" pidKey="pid_alt" refY={400} refLabel="Target 400km" />
            <CompareChart data={merged} title="CUMULATIVE REWARD" ppoKey="ppo_reward" pidKey="pid_reward" />
            <CompareChart data={merged} title="FUEL REMAINING (kg)" ppoKey="ppo_fuel" pidKey="pid_fuel" />
          </div>
        </>
      )}

      {status === 'idle' && !result && (
        <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
          <Swords size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Click "Run Comparison" to pit the PPO agent against the PID baseline.</p>
        </div>
      )}
    </main>
  );
}
