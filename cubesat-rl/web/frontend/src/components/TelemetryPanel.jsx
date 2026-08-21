import { Zap, Fuel, Battery, Navigation, TrendingUp } from 'lucide-react';

function Metric({ label, value, unit, color = 'var(--cyan)', icon: Icon }) {
  return (
    <div className="stat-tile">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
        {Icon && <Icon size={12} color={color} />}
        <span className="stat-label">{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span className="stat-value" style={{ color }}>{value ?? '—'}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
    </div>
  );
}

export default function TelemetryPanel({ data, controller = 'ppo', compact = false }) {
  const color = controller === 'ppo' ? 'var(--cyan)' : 'var(--orange)';
  if (!data) {
    return (
      <div className="card" style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>
        <p>Waiting for telemetry...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Step counter */}
      {!compact && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div className="live-dot" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.1em', color }}>
            STEP {data.step || '—'}
          </span>
          {data.total_reward !== undefined && (
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Σ Reward: <strong style={{ color }}>{data.total_reward?.toFixed(2)}</strong>
            </span>
          )}
        </div>
      )}

      <div className="grid-2">
        <Metric label="Altitude"     value={data.alt_km?.toFixed(1)}   unit="km"  color={color}            icon={Navigation} />
        <Metric label="Velocity"     value={data.vel_ms?.toFixed(0)}   unit="m/s" color="var(--text-primary)" icon={TrendingUp} />
        <Metric label="Fuel"         value={data.fuel_kg?.toFixed(4)}  unit="kg"  color="var(--green)"     icon={Fuel} />
        <Metric label="Battery"      value={data.batt_wh?.toFixed(2)}  unit="Wh"  color="var(--yellow)"    icon={Battery} />
      </div>

      {/* Action bars */}
      {data.action && (
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            CONTROL ACTIONS
          </p>
          {['Thrust', 'Torque X', 'Torque Y', 'Torque Z'].map((label, i) => {
            const val = data.action[i] ?? 0;
            const pct = ((val + 1) / 2) * 100; // map [-1,1] → [0%,100%]
            return (
              <div key={label} style={{ marginBottom: '0.45rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{label}</span>
                  <span style={{ fontSize: '0.65rem', color }}>{val.toFixed(3)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${pct}%`,
                    background: val > 0
                      ? `linear-gradient(90deg, transparent, ${color})`
                      : `linear-gradient(90deg, var(--orange), transparent)`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step reward */}
      {data.reward !== undefined && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          background: data.reward >= 0 ? 'var(--green-dim)' : 'var(--orange-dim)',
          border: `1px solid ${data.reward >= 0 ? 'rgba(34,211,165,0.25)' : 'rgba(255,107,53,0.25)'}`,
          borderRadius: 'var(--radius-sm)',
        }}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            STEP REWARD
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: data.reward >= 0 ? 'var(--green)' : 'var(--orange)' }}>
            {data.reward?.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
}
