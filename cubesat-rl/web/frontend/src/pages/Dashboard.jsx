import { Link } from 'react-router-dom';
import { Play, Swords, Brain, GitBranch } from 'lucide-react';
import OrbitVisualizer from '../components/OrbitVisualizer';

const STATS = [
  { label: 'Training Steps',      value: '6.2M',  color: 'var(--cyan)' },
  { label: 'Obs. Dimensions',     value: '15',    color: 'var(--purple)' },
  { label: 'Action Dimensions',   value: '4',     color: 'var(--orange)' },
  { label: 'Network Layers',      value: '3×256', color: 'var(--green)' },
  { label: 'Fuel Saved vs PID',   value: '98.3%', color: 'var(--yellow)' },
  { label: 'Sim Speedup (Numba)', value: '600×',  color: 'var(--cyan)' },
];

const FEATURES = [
  { icon: Play,     title: 'Live Simulator',     desc: 'Run real-time orbital simulation with PPO, PID, or random controller.', to: '/simulate', color: 'var(--cyan)' },
  { icon: Swords,   title: 'Head-to-Head',        desc: 'Compare the RL agent vs. classical PID side-by-side with full metrics.', to: '/compare', color: 'var(--orange)' },
  { icon: Brain,    title: 'Model Explorer',      desc: 'Dive into the network architecture, reward function, and training curves.', to: '/model', color: 'var(--purple)' },
  { icon: GitBranch, title: 'Physics Engine',     desc: 'Powered by 6-DOF RK4 integration with J₂ perturbation and drag.', to: '/about', color: 'var(--green)' },
];

export default function Dashboard() {
  return (
    <main className="page-container">
      {/* Hero */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center', minHeight: '70vh', paddingTop: '2rem' }}>
        <div className="animate-fade-in">
          <div className="badge badge-cyan" style={{ marginBottom: '1.2rem' }}>
            <span>⬡</span> Reinforcement Learning · Orbital Mechanics
          </div>
          <h1 style={{ marginBottom: '1.2rem', lineHeight: 1.15 }}>
            <span className="glow-cyan">CubeSat</span><br />
            RL Portal
          </h1>
          <p style={{ fontSize: '1.05rem', marginBottom: '2rem', maxWidth: 480 }}>
            A 3D 6-DOF orbital control simulation powered by a deep PPO agent.
            Explore live simulations, compare controllers, and understand the physics engine behind the model.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/simulate" className="btn btn-primary">
              <Play size={14} /> Run Simulation
            </Link>
            <Link to="/compare" className="btn btn-secondary">
              <Swords size={14} /> Compare Models
            </Link>
          </div>
        </div>

        <div className="animate-float">
          <OrbitVisualizer height={420} autoOrbit />
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ margin: '3rem 0' }}>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: '0.75rem' }}>
          {STATS.map(s => (
            <div key={s.label} className="stat-tile" style={{ textAlign: 'center', alignItems: 'center' }}>
              <span className="stat-label">{s.label}</span>
              <span className="stat-value" style={{ color: s.color, fontSize: '1.3rem' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section>
        <div className="section-heading">
          <h2>Explore the Portal</h2>
          <div className="section-divider" />
        </div>
        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {FEATURES.map(({ icon: Icon, title, desc, to, color }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ height: '100%', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: `color-mix(in srgb, ${color} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  <Icon size={20} color={color} />
                </div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem' }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upgrade timeline */}
      <section style={{ marginTop: '3rem' }}>
        <div className="section-heading">
          <h2>Model Journey</h2>
          <div className="section-divider" />
        </div>
        <div className="card-glass" style={{ padding: '1.5rem' }}>
          {[
            { label: '1D → 3D Physics',   desc: 'Upgraded from planar 2D simulation to full 6-DOF RK4 with J₂ gravity and atmospheric drag' },
            { label: 'Numba JIT',          desc: 'Compiled physics inner loop to native machine code — 600× speedup (8 FPS → 5,000 FPS)' },
            { label: 'Reward Engineering', desc: 'Gaussian-shaped orbital accuracy reward eliminated reward hacking and "do-nothing" strategy' },
            { label: '6.2M Step Training', desc: 'Stable convergence with lr=1e-4, clip_range=0.1, target_kl=0.01 on 8 parallel environments' },
            { label: '98.3% Fuel Saving',  desc: 'PPO agent outperforms classical PID in total reward while using 60× less propellant' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: i < 4 ? '1.2rem' : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)', flexShrink: 0, marginTop: 4 }} />
                {i < 4 && <div style={{ width: 1, flex: 1, background: 'var(--border-glass)', margin: '4px 0' }} />}
              </div>
              <div style={{ paddingBottom: '0.5rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--cyan)', marginBottom: '0.25rem' }}>{item.label}</p>
                <p style={{ fontSize: '0.85rem' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
