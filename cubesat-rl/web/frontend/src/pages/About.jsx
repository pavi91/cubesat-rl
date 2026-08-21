import { Info, Code2, Atom, Cpu, Zap } from 'lucide-react';

const PHYSICS = [
  { title: 'J₂ Gravity Perturbation', icon: Atom, color: 'var(--cyan)', desc: 'Earth is not a perfect sphere — the equatorial bulge causes precession of orbital planes. We model this with the J₂ = 1.08×10⁻³ zonal harmonic, giving realistic long-term drift behaviour.' },
  { title: 'Atmospheric Drag', icon: Zap, color: 'var(--orange)', desc: 'At 400 km altitude, residual atmosphere causes significant drag. We use an exponential density model (ρ₀=2.72×10⁻¹² kg/m³, H=50 km scale height) with Cd=2.2 and A=0.01 m² for the 1U CubeSat.' },
  { title: 'RK4 Integration', icon: Cpu, color: 'var(--green)', desc: 'The equations of motion are integrated using the Runge-Kutta 4th order method with 60 sub-steps per environment timestep (Δt=60 s) to maintain numerical stability for quaternion kinematics.' },
  { title: 'Battery & Eclipse', icon: Zap, color: 'var(--yellow)', desc: 'Battery charges during sunlit portions and drains during eclipse. Thruster and attitude control are disabled when the battery is depleted, creating a resource management sub-problem for the agent.' },
];

const TIMELINE = [
  { date: 'Start',       label: '1D Planar Simulation',     color: 'var(--text-muted)' },
  { date: 'Phase 2',    label: '3D 6-DOF + J₂ + Drag',     color: 'var(--purple)' },
  { date: 'Phase 3',    label: 'Cascaded PD Baseline',      color: 'var(--orange)' },
  { date: 'Phase 4',    label: 'Deep [256×256×256] PPO',    color: 'var(--cyan)' },
  { date: 'Phase 5',    label: 'Numba JIT · 600× speedup',  color: 'var(--green)' },
  { date: 'Phase 6',    label: 'Reward engineering fix',    color: 'var(--yellow)' },
  { date: 'Final',      label: '6.2M steps · 98.3% fuel saving', color: 'var(--cyan)' },
];

export default function About() {
  return (
    <main className="page-container">
      <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
        <Info size={20} color="var(--cyan)" />
        <h2>About This Project</h2>
        <div className="section-divider" />
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        <div>
          {/* Overview */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--cyan)', marginBottom: '0.75rem' }}>Overview</h3>
            <p style={{ marginBottom: '0.75rem' }}>
              This project trains a Proximal Policy Optimization (PPO) agent to control a 1U CubeSat in low Earth orbit.
              The agent observes the full 6-DOF state vector — position, velocity, attitude quaternion, angular rates, fuel, and battery —
              and outputs continuous thrust and torque commands to maintain a target 400 km orbit.
            </p>
            <p>
              The physics engine is built from scratch using NumPy and Numba JIT compilation,
              achieving simulation speeds over 5,000 environment steps per second on a single MacBook Pro.
            </p>
          </div>

          {/* Physics */}
          <div className="section-heading">
            <h3 style={{ color: 'var(--text-primary)' }}>Physics Engine</h3>
            <div className="section-divider" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {PHYSICS.map(({ title, icon: Icon, color, desc }) => (
              <div key={title} className="card" style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{
                  width: 38, height: 38, flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={color} />
                </div>
                <div>
                  <h3 style={{ color, marginBottom: '0.25rem', fontSize: '0.9rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.8rem' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* Project timeline */}
          <div className="section-heading">
            <h3 style={{ color: 'var(--text-primary)' }}>Development Timeline</h3>
            <div className="section-divider" />
          </div>
          <div className="card-glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            {TIMELINE.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: i < TIMELINE.length - 1 ? '1.1rem' : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, boxShadow: `0 0 8px ${item.color}`, flexShrink: 0, marginTop: 4 }} />
                  {i < TIMELINE.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />}
                </div>
                <div style={{ paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{item.date} ·</span>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: item.color, display: 'inline', marginLeft: '0.35rem' }}>{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* MDP Spec */}
          <div className="section-heading">
            <h3 style={{ color: 'var(--text-primary)' }}>MDP Specification</h3>
            <div className="section-divider" />
          </div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <tbody>
                {[
                  ['Target Orbit',      '400 km LEO'],
                  ['State Space',       '15-dimensional continuous'],
                  ['Action Space',      '4-dimensional continuous Box[−1, 1]'],
                  ['Max Thrust',        '10 mN'],
                  ['Max Torque',        '0.1 mN·m (per axis)'],
                  ['Fuel Budget',       '1.0 kg propellant'],
                  ['Battery Capacity',  '10 Wh'],
                  ['Timestep',          '60 seconds'],
                  ['Episode Length',    '2,000 steps (≈33 hours)'],
                  ['Discount γ',        '0.99'],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '50%' }}>{k}</td>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '0.72rem' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stack */}
          <div className="info-box">
            <strong style={{ color: '#a78bfa' }}>Tech Stack: </strong>
            Python 3.9 · Gymnasium · Stable-Baselines3 · Numba · NumPy · SciPy ·
            Node.js · Express · Socket.io · React · Vite · Three.js · Recharts
          </div>
        </div>
      </div>
    </main>
  );
}
