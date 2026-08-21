import { useState } from 'react';
import { Brain, Layers, Target, Zap } from 'lucide-react';

const REWARD_COMPONENTS = [
  { name: 'Orbital Accuracy', weight: '80%', color: 'var(--cyan)',   formula: 'exp(−0.5·(r_err/σ)²)', desc: 'Gaussian bonus peaking at +1.0 when on target orbit. Falls off smoothly with altitude error.' },
  { name: 'Velocity Tracking', weight: '15%', color: 'var(--green)', formula: 'exp(−0.5·(v_err/100)²)', desc: 'Keeps orbital velocity close to the circular orbit speed at the target radius.' },
  { name: 'Fuel Efficiency',   weight: '5%',  color: 'var(--yellow)', formula: '−0.1·thrust', desc: 'Tiny penalty for using propellant. Small enough that it never outweighs orbit accuracy.' },
];

const NETWORK_LAYERS = [
  { name: 'Input (Obs)',  size: 15, color: 'var(--purple)', note: 'r, v, q, ω, m, batt' },
  { name: 'Hidden 1',    size: 256, color: 'var(--cyan)',   note: 'ReLU activation' },
  { name: 'Hidden 2',    size: 256, color: 'var(--cyan)',   note: 'ReLU activation' },
  { name: 'Hidden 3',    size: 256, color: 'var(--cyan)',   note: 'ReLU activation' },
  { name: 'Output (π)',  size: 4,   color: 'var(--orange)', note: 'thrust, τx, τy, τz' },
];

const OBS_DIMS = [
  { dims: '0–2',  label: 'Position r⃗',   color: 'var(--cyan)',   desc: 'ECI frame position (x, y, z) normalized by 7×10⁶ m' },
  { dims: '3–5',  label: 'Velocity v⃗',   color: 'var(--green)',  desc: 'ECI frame velocity (vx, vy, vz) normalized by 8×10³ m/s' },
  { dims: '6–9',  label: 'Quaternion q', color: 'var(--purple)', desc: 'Body attitude quaternion (q0, q1, q2, q3) — unit vector' },
  { dims: '10–12',label: 'Ang. Velocity ω⃗', color: 'var(--yellow)', desc: 'Body angular rates (wx, wy, wz) normalized by 0.1 rad/s' },
  { dims: '13',   label: 'Fuel mass m',  color: 'var(--orange)', desc: 'Remaining propellant mass, normalized to [−1, 1]' },
  { dims: '14',   label: 'Battery b',    color: 'var(--cyan)',   desc: 'Battery charge in Wh, normalized to [−1, 1]' },
];

const ACTION_DIMS = [
  { dim: 0, label: 'Thrust',   range: '[0, 1]', mapped: '0 → 10 mN', color: 'var(--cyan)' },
  { dim: 1, label: 'Torque X', range: '[−1, 1]', mapped: '± 0.1 mN·m', color: 'var(--orange)' },
  { dim: 2, label: 'Torque Y', range: '[−1, 1]', mapped: '± 0.1 mN·m', color: 'var(--orange)' },
  { dim: 3, label: 'Torque Z', range: '[−1, 1]', mapped: '± 0.1 mN·m', color: 'var(--orange)' },
];

export default function ModelExplorer() {
  const [altErr, setAltErr] = useState(0);
  const rewardPreview = Math.exp(-0.5 * Math.pow(altErr / 60000, 2));

  return (
    <main className="page-container">
      <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
        <Brain size={20} color="var(--purple)" />
        <h2>Model Explorer</h2>
        <div className="section-divider" />
        <span className="badge badge-purple">PPO · 6.2M steps</span>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: '2rem', gap: '0.75rem' }}>
        {[
          { label: 'Algorithm',    value: 'PPO',        color: 'var(--cyan)' },
          { label: 'Policy Net',   value: '3×256 MLP',  color: 'var(--purple)' },
          { label: 'Value Net',    value: '3×256 MLP',  color: 'var(--purple)' },
          { label: 'Total Steps',  value: '6.2M',       color: 'var(--green)' },
          { label: 'Batch Size',   value: '128',        color: 'var(--text-primary)' },
          { label: 'Learning Rate',value: '1e-4',       color: 'var(--text-primary)' },
          { label: 'Clip Range',   value: '0.1',        color: 'var(--text-primary)' },
          { label: 'Target KL',    value: '0.01',       color: 'var(--yellow)' },
        ].map(s => (
          <div key={s.label} className="stat-tile" style={{ textAlign: 'center', alignItems: 'center' }}>
            <span className="stat-label">{s.label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color, fontSize: '1rem' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Network Architecture */}
      <section style={{ marginBottom: '2rem' }}>
        <div className="section-heading">
          <Layers size={16} color="var(--cyan)" />
          <h3 style={{ color: 'var(--text-primary)' }}>Network Architecture</h3>
          <div className="section-divider" />
        </div>
        <div className="card-glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            {NETWORK_LAYERS.map((layer, i) => (
              <div key={layer.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                  padding: '0.75rem 1rem',
                  background: `color-mix(in srgb, ${layer.color} 10%, var(--bg-card))`,
                  border: `1px solid color-mix(in srgb, ${layer.color} 30%, transparent)`,
                  borderRadius: 'var(--radius-md)',
                  minWidth: 90,
                }}>
                  <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{layer.name}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: layer.color }}>{layer.size}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{layer.note}</span>
                </div>
                {i < NETWORK_LAYERS.length - 1 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', flexShrink: 0 }}>→</div>
                )}
              </div>
            ))}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Shared MLP backbone used for both policy (π) and value (V) networks. Both branches have identical architecture.
          </p>
        </div>
      </section>

      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Observation Space */}
        <section>
          <div className="section-heading">
            <h3 style={{ color: 'var(--text-primary)' }}>Observation Space (15D)</h3>
            <div className="section-divider" />
          </div>
          <div className="card" style={{ padding: '0' }}>
            {OBS_DIMS.map(o => (
              <div key={o.dims} style={{
                display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  flexShrink: 0, width: 40, height: 40,
                  background: `color-mix(in srgb, ${o.color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${o.color} 25%, transparent)`,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '0.6rem', color: o.color,
                }}>
                  [{o.dims}]
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: o.color, marginBottom: '0.15rem' }}>{o.label}</p>
                  <p style={{ fontSize: '0.75rem' }}>{o.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action Space + Reward */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section>
            <div className="section-heading">
              <h3 style={{ color: 'var(--text-primary)' }}>Action Space (4D)</h3>
              <div className="section-divider" />
            </div>
            <div className="card">
              {ACTION_DIMS.map(a => (
                <div key={a.dim} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 'var(--radius-sm)',
                    background: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${a.color} 30%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '0.6rem', color: a.color, flexShrink: 0,
                  }}>{a.dim}</span>
                  <div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: a.color }}>{a.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{a.range} → {a.mapped}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Interactive reward preview */}
          <section>
            <div className="section-heading">
              <Target size={14} color="var(--green)" />
              <h3 style={{ color: 'var(--text-primary)' }}>Reward Function</h3>
              <div className="section-divider" />
            </div>
            <div className="card">
              {REWARD_COMPONENTS.map(r => (
                <div key={r.name} style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: r.color }}>{r.name}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.weight}</span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: '0.3rem' }}>
                    <div className="progress-fill" style={{ width: r.weight, background: r.color, opacity: 0.7 }} />
                  </div>
                  <p style={{ fontSize: '0.72rem', marginBottom: '0.1rem' }}><code style={{ color: r.color, background: 'var(--bg-card)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>{r.formula}</code></p>
                  <p style={{ fontSize: '0.72rem' }}>{r.desc}</p>
                </div>
              ))}

              {/* Interactive slider */}
              <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'var(--bg-space)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  INTERACTIVE: ALTITUDE ERROR → REWARD
                </p>
                <input type="range" min={0} max={200000} step={1000} value={altErr}
                  onChange={e => setAltErr(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--green)', marginBottom: '0.4rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Alt error: {(altErr/1000).toFixed(0)} km</span>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color: 'var(--green)' }}>
                    r_orbit = {rewardPreview.toFixed(4)}
                  </span>
                </div>
                <div className="progress-bar" style={{ marginTop: '0.3rem' }}>
                  <div className="progress-fill" style={{ width: `${rewardPreview * 100}%`, background: 'var(--green)' }} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
