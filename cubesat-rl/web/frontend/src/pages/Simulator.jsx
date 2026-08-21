import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Play, Square, RotateCcw, Brain, Bot, Shuffle, AlertTriangle } from 'lucide-react';
import OrbitVisualizer from '../components/OrbitVisualizer';
import TelemetryPanel from '../components/TelemetryPanel';
import LiveCharts from '../components/LiveCharts';
import { useAuth } from '../context/AuthContext';

const BACKEND = 'http://localhost:3001';

const CONTROLLERS = [
  { id: 'ppo',    label: 'PPO Agent',        icon: Brain,   color: 'var(--cyan)',   badge: 'badge-cyan' },
  { id: 'pid',    label: 'PID Baseline',      icon: Bot,     color: 'var(--orange)', badge: 'badge-orange' },
  { id: 'random', label: 'Random Policy',     icon: Shuffle, color: 'var(--purple)', badge: 'badge-purple' },
];

export default function Simulator() {
  const { user } = useAuth();
  const [controller, setController] = useState('ppo');
  const [steps, setSteps] = useState(200);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const socketRef = useRef(null);

  const color = CONTROLLERS.find(c => c.id === controller)?.color || 'var(--cyan)';

  useEffect(() => {
    socketRef.current = io(BACKEND);
    socketRef.current.on('simulation_data', (data) => {
      if (data.type === 'step') {
        setLatest(data);
        setHistory(h => [...h, data]);
      }
    });
    socketRef.current.on('simulation_complete', () => setStatus('done'));
    socketRef.current.on('simulation_error', () => setStatus('error'));
    return () => socketRef.current?.disconnect();
  }, []);

  const handleStart = useCallback(() => {
    setStatus('running');
    setHistory([]);
    setLatest(null);
    setSummary(null);
    socketRef.current?.emit('start_simulation', {
      controller,
      steps,
      userId: user?.id ?? null,
    });
  }, [controller, steps, user]);

  const handleStop = useCallback(() => {
    socketRef.current?.emit('stop_simulation');
    setStatus('idle');
  }, []);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setHistory([]);
    setLatest(null);
    setSummary(null);
  }, []);

  const isRunning = status === 'running';
  const isDone = status === 'done';

  // Satellite position for 3D viz (normalize r_vec to [-1.5, 1.5] range)
  const satPos = latest?.r_vec
    ? latest.r_vec.map(v => v * 1.45)
    : null;

  return (
    <main className="page-container">
      <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
        <h2>Live Simulator</h2>
        <div className="section-divider" />
        {isRunning && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div className="live-dot" /><span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color: 'var(--green)' }}>LIVE</span></div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* ── Control Panel ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>CONTROLLER</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {CONTROLLERS.map(({ id, label, icon: Icon, color: c }) => (
                <button key={id}
                  disabled={isRunning}
                  onClick={() => setController(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${controller === id ? c : 'var(--border-subtle)'}`,
                    background: controller === id ? `color-mix(in srgb, ${c} 12%, transparent)` : 'transparent',
                    color: controller === id ? c : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'var(--font-display)',
                    fontSize: '0.72rem', letterSpacing: '0.06em',
                    transition: 'all 0.15s',
                  }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>STEPS: {steps}</p>
            <input type="range" min={50} max={2000} step={50} value={steps}
              onChange={e => setSteps(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: '100%', accentColor: color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>50</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>2000</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              ≈ {(steps * 60 / 3600).toFixed(1)} hours of orbit
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!isRunning ? (
              <button className="btn btn-primary" onClick={handleStart} style={{ justifyContent: 'center' }}>
                <Play size={14} /> Launch
              </button>
            ) : (
              <button className="btn btn-danger" onClick={handleStop} style={{ justifyContent: 'center' }}>
                <Square size={14} /> Stop
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleReset} disabled={isRunning} style={{ justifyContent: 'center' }}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Status */}
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: isDone ? 'var(--green-dim)' : isRunning ? 'var(--cyan-dim)' : 'var(--bg-card)',
            border: `1px solid ${isDone ? 'rgba(34,211,165,0.3)' : isRunning ? 'var(--border-glass)' : 'var(--border-subtle)'}`,
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.1em',
              color: isDone ? 'var(--green)' : isRunning ? 'var(--cyan)' : 'var(--text-muted)' }}>
              {isDone ? '✓ COMPLETE' : isRunning ? `STEP ${latest?.step || 0} / ${steps}` : 'READY'}
            </p>
            {isRunning && (
              <div className="progress-bar" style={{ marginTop: '0.4rem' }}>
                <div className="progress-fill" style={{ width: `${((latest?.step || 0) / steps) * 100}%`, background: color }} />
              </div>
            )}
          </div>

          {/* Summary card */}
          {isDone && latest && (
            <div className="card" style={{ borderColor: color }}>
              <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color, marginBottom: '0.75rem' }}>SUMMARY</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {[
                  ['Total Reward', latest.total_reward?.toFixed(2)],
                  ['Final Alt', `${latest.alt_km?.toFixed(1)} km`],
                  ['Fuel Used', `${((1.0 - latest.fuel_kg) * 1000).toFixed(1)} g`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemetry */}
          {latest && <TelemetryPanel data={latest} controller={controller} />}
        </aside>

        {/* ── Main Area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {latest?.alerts?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {latest.alerts.map((alert, idx) => (
                <div key={idx} style={{
                  padding: '0.75rem 1rem',
                  background: alert.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}>
                  <AlertTriangle size={16} color={alert.severity === 'critical' ? '#f87171' : '#fbbf24'} />
                  <div>
                    <strong style={{ color: alert.severity === 'critical' ? '#f87171' : '#fbbf24', fontSize: '0.8rem', display: 'block', marginBottom: '0.1rem' }}>
                      {alert.type.replace('_', ' ')}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <OrbitVisualizer
            satellitePosition={satPos}
            satelliteColor={color}
            autoOrbit={!latest}
            height={380}
            action={latest?.action}
          />
          <LiveCharts history={history} color={color} />
        </div>
      </div>
    </main>
  );
}
