import { useState, useCallback, useEffect } from 'react';
import { Swords, Play, Trophy, Rocket, LogIn, AlertTriangle, FileText, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const BACKEND = 'http://localhost:3001';

// ── helpers ───────────────────────────────────────────────────────────────────
function mergeTrajectories(ppo, pid) {
  const len = Math.max(ppo?.length || 0, pid?.length || 0);
  const out = [];
  for (let i = 0; i < len; i++) {
    out.push({
      step:       (ppo[i] || pid[i]).step,
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
          <Line type="monotone" dataKey={ppoKey} name="PPO Agent"    stroke="var(--cyan)"   dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey={pidKey} name="PID Baseline" stroke="var(--orange)" dot={false} strokeWidth={2} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Mission selector ──────────────────────────────────────────────────────────
function MissionSelector({ missions, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
        MISSION PROFILE (optional)
      </p>
      <select
        id="compare-mission-select"
        value={selected ?? ''}
        onChange={e => onSelect(e.target.value ? Number(e.target.value) : null)}
        style={{
          background: 'var(--bg-space)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)', padding: '0.55rem 0.75rem',
          color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
          outline: 'none', minWidth: 220,
        }}
      >
        <option value="">— No mission profile —</option>
        {missions.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      {selected && missions.find(m => m.id === selected) && (() => {
        const m = missions.find(x => x.id === selected);
        return (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Target {m.target_alt_km} km · Min {m.min_alt_km} km · Fuel {m.fuel_budget_kg} kg
          </p>
        );
      })()}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Compare() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [steps,     setSteps]     = useState(200);
  const [status,    setStatus]    = useState('idle');
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [missions,  setMissions]  = useState([]);
  const [missionId, setMissionId] = useState(null);

  // Load missions if logged in
  useEffect(() => {
    if (!user) return;
    axios.get(`${BACKEND}/api/missions`)
      .then(r => setMissions(r.data.data || []))
      .catch(() => {});
  }, [user]);

  const run = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    setStatus('loading');
    setResult(null);
    setError(null);
    try {
      // axios automatically sends the JWT Authorization header (set in AuthContext)
      const { data } = await axios.post(`${BACKEND}/api/compare`, {
        steps,
        seed: 42,
        ...(missionId ? { mission_profile_id: missionId } : {}),
      });
      if (data.status === 'done') {
        setResult(data);
        setStatus('done');
      } else {
        throw new Error(data.error || 'Unexpected response');
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Server error';
      setError(msg);
      setStatus('error');
    }
  }, [steps, missionId, user, navigate]);

  const handleExport = useCallback(async () => {
    if (!result?.cmp_id) return;
    try {
      const { data } = await axios.post(`${BACKEND}/api/reports/generate`, {
        comparison_id: result.cmp_id
      });
      // trigger download
      window.open(`${BACKEND}/api/reports/${result.cmp_id}/download?token=${localStorage.getItem('cubesat_token') || ''}`, '_blank');
    } catch (e) {
      alert("Failed to export report: " + (e.response?.data?.error || e.message));
    }
  }, [result]);

  const merged   = result ? mergeTrajectories(result.ppo?.trajectory, result.pid?.trajectory) : [];
  const rec      = result?.recommendation;
  const ppoWins  = rec?.winner === 'ppo';

  const activeMission = missionId && missions.find(m => m.id === missionId);

  return (
    <main className="page-container">
      <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
        <Swords size={20} color="var(--orange)" />
        <h2>Head-to-Head Comparison</h2>
        <div className="section-divider" />
        {activeMission && (
          <span className="badge badge-cyan">
            <Rocket size={10} /> {activeMission.name}
          </span>
        )}
      </div>

      {/* ── Config bar ── */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Steps slider */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            EVALUATION STEPS: {steps} (≈{(steps * 60 / 3600).toFixed(1)}h)
          </p>
          <input type="range" id="compare-steps" min={50} max={500} step={50} value={steps}
            onChange={e => setSteps(Number(e.target.value))}
            disabled={status === 'loading'}
            style={{ width: '100%', accentColor: 'var(--cyan)' }} />
        </div>

        {/* Mission selector (only for logged-in users) */}
        {user ? (
          <MissionSelector missions={missions} selected={missionId} onSelect={setMissionId} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sign in to use mission profiles</span>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }} onClick={() => navigate('/login')}>
              <LogIn size={12} /> Sign In
            </button>
          </div>
        )}

        {/* Run button */}
        <button
          id="run-comparison-btn"
          className="btn btn-primary"
          onClick={run}
          disabled={status === 'loading'}
        >
          {status === 'loading'
            ? '⏳ Running…'
            : !user
              ? <><LogIn size={14} /> Sign In to Run</>
              : <><Play size={14} /> Run Comparison</>
          }
        </button>
      </div>

      {/* ── Loading state ── */}
      {status === 'loading' && (
        <div className="info-box" style={{ marginBottom: '1.5rem' }}>
          🛰️ Running PPO agent then PID baseline{activeMission ? ` against mission profile "${activeMission.name}"` : ''}…
          This takes ~30 seconds as Python loads and simulates both trajectories.
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ color: '#f87171' }}>Error: {error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <>
          {/* Verdict */}
          <div style={{
            marginBottom: '1.5rem', padding: '1.5rem',
            background: rec?.winner === 'PPO_RECOMMENDED' ? 'var(--cyan-dim)' : rec?.winner === 'PID_RECOMMENDED' ? 'var(--orange-dim)' : 'var(--bg-card)',
            border: `1px solid ${rec?.winner === 'PPO_RECOMMENDED' ? 'rgba(0,212,255,0.3)' : rec?.winner === 'PID_RECOMMENDED' ? 'rgba(255,107,53,0.3)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
          }}>
            <Trophy size={32} color={rec?.winner === 'PPO_RECOMMENDED' ? 'var(--cyan)' : rec?.winner === 'PID_RECOMMENDED' ? 'var(--orange)' : 'var(--text-muted)'} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <h3 style={{ color: rec?.winner === 'PPO_RECOMMENDED' ? 'var(--cyan)' : rec?.winner === 'PID_RECOMMENDED' ? 'var(--orange)' : 'var(--text-primary)', margin: 0 }}>
                  {rec?.winner === 'PPO_RECOMMENDED' ? '🧠 PPO Agent Recommended' : rec?.winner === 'PID_RECOMMENDED' ? '🤖 PID Baseline Recommended' : rec?.winner === 'NO_CONTROLLER_RECOMMENDED' ? '⚠️ No Controller Recommended' : '⚖️ Inconclusive Result'}
                </h3>
                {rec?.confidence && (
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    {rec.confidence.toUpperCase()} CONFIDENCE
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.88rem' }}>{rec?.summary}</p>
              
              {rec?.warnings?.length > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    <AlertTriangle size={14} /> MISSION CONSTRAINT WARNINGS
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#f87171', fontSize: '0.8rem' }}>
                    {rec.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {activeMission && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Evaluated against mission profile: <strong style={{ color: 'var(--text-primary)' }}>{activeMission.name}</strong>
                  {' · '}Target altitude: {activeMission.target_alt_km} km
                  {' · '}Fuel budget: {activeMission.fuel_budget_kg} kg
                </p>
              )}
            </div>
          </div>
          
          {user && result.cmp_id && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={handleExport}>
                <FileText size={14} /> Export PDF Report
              </button>
            </div>
          )}

          {/* Requirements Verification Table */}
          {result.ppo_verify && result.pid_verify && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={16} color="var(--cyan)" /> Mission Verification Requirements
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Requirement</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--cyan)' }}>PPO Agent</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--orange)' }}>PID Baseline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ppo_verify.requirements.map((ppoReq, i) => {
                      const pidReq = result.pid_verify.requirements[i];
                      return (
                        <tr key={ppoReq.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ppoReq.id}: {ppoReq.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ppoReq.requirement}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', background: 'rgba(0, 212, 255, 0.02)' }}>
                            <div style={{ color: ppoReq.passed ? 'var(--green)' : '#f87171', fontWeight: 700, marginBottom: '0.2rem' }}>
                              {ppoReq.passed ? 'PASS' : 'FAIL'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{ppoReq.actual}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', background: 'rgba(255, 107, 53, 0.02)' }}>
                            <div style={{ color: pidReq.passed ? 'var(--green)' : '#f87171', fontWeight: 700, marginBottom: '0.2rem' }}>
                              {pidReq.passed ? 'PASS' : 'FAIL'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{pidReq.actual}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary stat cards */}
          <div className="grid-2" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
            {['ppo', 'pid'].map(ctrl => {
              const s     = result[ctrl]?.summary;
              const v     = result[`${ctrl}_verify`]?.metrics;
              const color = ctrl === 'ppo' ? 'var(--cyan)' : 'var(--orange)';
              const label = ctrl === 'ppo' ? 'PPO Agent 🧠' : 'PID Baseline 🤖';
              const isWinner = rec?.winner === (ctrl === 'ppo' ? 'PPO_RECOMMENDED' : 'PID_RECOMMENDED');
              return (
                <div key={ctrl} className="card" style={{ borderColor: color }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ color }}>{label}</h3>
                    {isWinner && <Trophy size={16} color={color} />}
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
                      <span className="stat-label">RMS Error</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{v?.rms_altitude_error_km?.toFixed(1) ?? 'N/A'}<span className="stat-unit">km</span></span>
                    </div>
                    <div className="stat-tile">
                      <span className="stat-label">Time in Tolerance</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{v?.time_in_tolerance_percent?.toFixed(1) ?? 'N/A'}<span className="stat-unit">%</span></span>
                    </div>
                    <div className="stat-tile">
                      <span className="stat-label">Fuel Used</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{(s?.fuel_consumed * 1000).toFixed(1)}<span className="stat-unit">g</span></span>
                    </div>
                    <div className="stat-tile">
                      <span className="stat-label">Steps Survived</span>
                      <span className="stat-value" style={{ color, fontSize: '1.3rem' }}>{s?.steps_survived}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CompareChart data={merged} title="ALTITUDE (km)"
              ppoKey="ppo_alt" pidKey="pid_alt"
              refY={activeMission?.target_alt_km ?? 400}
              refLabel={`Target ${activeMission?.target_alt_km ?? 400} km`} />
            <CompareChart data={merged} title="CUMULATIVE REWARD"    ppoKey="ppo_reward" pidKey="pid_reward" />
            <CompareChart data={merged} title="FUEL REMAINING (kg)"  ppoKey="ppo_fuel"   pidKey="pid_fuel" />
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {status === 'idle' && !result && (
        <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
          <Swords size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Click "Run Comparison" to pit the PPO agent against the PID baseline.</p>
          {!user && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>You need to sign in first.</p>}
        </div>
      )}
    </main>
  );
}
