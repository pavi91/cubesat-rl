import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Rocket, Save, Trash2, Plus, Edit3, Globe, Lock,
  Target, Fuel, Zap, ChevronRight, AlertCircle,
} from 'lucide-react';

const BACKEND = 'http://localhost:3001';

const PRESETS = [
  { name: 'LEO Standard',    target_alt_km: 450, min_alt_km: 400, fuel_budget_kg: 1.0, power_budget_wh: 10, steps: 200 },
  { name: 'Low-Fuel Budget', target_alt_km: 420, min_alt_km: 390, fuel_budget_kg: 0.6, power_budget_wh: 8,  steps: 150 },
  { name: 'High Endurance',  target_alt_km: 500, min_alt_km: 450, fuel_budget_kg: 1.5, power_budget_wh: 15, steps: 500 },
  { name: 'Stress Test',     target_alt_km: 380, min_alt_km: 350, fuel_budget_kg: 0.5, power_budget_wh: 6,  steps: 300 },
];

const EMPTY_FORM = {
  name: '', description: '',
  target_alt_km: 450, min_alt_km: 400,
  fuel_budget_kg: 1.0, power_budget_wh: 10,
  steps: 200, is_public: false,
};

function SliderField({ label, id, value, onChange, min, max, step, unit, color = 'var(--cyan)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor={id} style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </label>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, color }}>
          {value}<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{min}{unit}</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{max}{unit}</span>
      </div>
    </div>
  );
}

function MissionCard({ mission, onDelete, onSelect, selected }) {
  const isOwned = true; // simplified — server enforces ownership
  return (
    <div style={{
      background: selected ? 'var(--cyan-dim)' : 'var(--bg-card)',
      border: `1px solid ${selected ? 'var(--cyan)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)', padding: '1rem',
      cursor: 'pointer', transition: 'all 0.15s',
    }}
      onClick={() => onSelect(mission)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.95rem' }}>🛰️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, color: selected ? 'var(--cyan)' : 'var(--text-primary)' }}>
            {mission.name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {mission.is_public
            ? <span className="badge badge-green"><Globe size={9} />Public</span>
            : <span className="badge" style={{ background: 'var(--bg-space)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontSize: '0.6rem' }}><Lock size={9} />Private</span>
          }
          <button
            id={`delete-mission-${mission.id}`}
            className="btn btn-danger"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
            onClick={e => { e.stopPropagation(); onDelete(mission.id); }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {mission.description && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{mission.description}</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem' }}>
        {[
          { icon: Target, label: 'Target',  val: `${mission.target_alt_km} km`, color: 'var(--cyan)' },
          { icon: Fuel,   label: 'Fuel',    val: `${mission.fuel_budget_kg} kg`, color: 'var(--orange)' },
          { icon: Zap,    label: 'Power',   val: `${mission.power_budget_wh} Wh`, color: 'var(--yellow)' },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <Icon size={11} color={color} style={{ marginBottom: 2 }} />
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{label}</p>
            <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', fontWeight: 700, color }}>{val}</p>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--cyan)', fontSize: '0.7rem', fontFamily: 'var(--font-display)' }}>
          <ChevronRight size={12} /> ACTIVE MISSION
        </div>
      )}
    </div>
  );
}

export default function MissionPlanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions]   = useState([]);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`${BACKEND}/api/missions`)
      .then(r => { setMissions(r.data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  function applyPreset(preset) {
    setForm(f => ({ ...f, ...preset }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Mission name is required'); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const r = await axios.post(`${BACKEND}/api/missions`, form);
      const newMission = { ...form, id: r.data.data?.id, user_id: user.id, owner_username: user.username };
      setMissions(m => [newMission, ...m]);
      setSuccess(`Mission "${form.name}" created successfully!`);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save mission');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this mission profile?')) return;
    await axios.delete(`${BACKEND}/api/missions/${id}`);
    setMissions(m => m.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  if (!user) {
    return (
      <main className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Sign in to manage mission profiles.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>Sign In</button>
      </main>
    );
  }

  return (
    <main className="page-container animate-fade-in">
      <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
        <Rocket size={20} color="var(--cyan)" />
        <h2>Mission Planner</h2>
        <div className="section-divider" />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
          Signed in as <span style={{ color: 'var(--cyan)' }}>{user.username}</span>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* ── Left: Create form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              QUICK PRESETS
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {PRESETS.map(p => (
                <button key={p.name} id={`preset-${p.name.replace(/\s+/g,'-').toLowerCase()}`}
                  className="btn btn-secondary" style={{ fontSize: '0.65rem', padding: '0.4rem 0.7rem' }}
                  onClick={() => applyPreset(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--cyan)', marginBottom: '1rem' }}>
              NEW MISSION PROFILE
            </p>

            {error && (
              <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.6rem 0.8rem',marginBottom:'0.75rem',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'var(--radius-md)',color:'#f87171',fontSize:'0.8rem' }}>
                <AlertCircle size={14} />{error}
              </div>
            )}
            {success && (
              <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.6rem 0.8rem',marginBottom:'0.75rem',background:'var(--green-dim)',border:'1px solid rgba(34,211,165,0.3)',borderRadius:'var(--radius-md)',color:'var(--green)',fontSize:'0.8rem' }}>
                ✓ {success}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Mission Name
                </label>
                <input id="mission-name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="e.g. LEO-450km-LowFuel"
                  style={{ background:'var(--bg-space)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-sm)',padding:'0.6rem 0.8rem',color:'var(--text-primary)',fontFamily:'var(--font-body)',fontSize:'0.9rem',outline:'none',width:'100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Description (optional)
                </label>
                <textarea id="mission-description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="Mission objectives and constraints…" rows={2}
                  style={{ background:'var(--bg-space)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-sm)',padding:'0.6rem 0.8rem',color:'var(--text-primary)',fontFamily:'var(--font-body)',fontSize:'0.85rem',outline:'none',width:'100%',resize:'vertical' }} />
              </div>

              <SliderField id="target-alt" label="Target Altitude" value={form.target_alt_km}
                onChange={v => setForm(f => ({...f, target_alt_km: v}))}
                min={300} max={600} step={10} unit=" km" color="var(--cyan)" />
              <SliderField id="min-alt" label="Minimum Altitude (Failure Threshold)" value={form.min_alt_km}
                onChange={v => setForm(f => ({...f, min_alt_km: v}))}
                min={200} max={550} step={10} unit=" km" color="var(--orange)" />
              <SliderField id="fuel-budget" label="Fuel Budget" value={form.fuel_budget_kg}
                onChange={v => setForm(f => ({...f, fuel_budget_kg: v}))}
                min={0.3} max={2.0} step={0.1} unit=" kg" color="var(--yellow)" />
              <SliderField id="power-budget" label="Power Budget" value={form.power_budget_wh}
                onChange={v => setForm(f => ({...f, power_budget_wh: v}))}
                min={3} max={25} step={0.5} unit=" Wh" color="var(--purple)" />
              <SliderField id="sim-steps" label="Simulation Steps" value={form.steps}
                onChange={v => setForm(f => ({...f, steps: v}))}
                min={50} max={2000} step={50} unit="" color="var(--green)" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input id="is-public" type="checkbox" checked={form.is_public}
                  onChange={e => setForm(f => ({...f, is_public: e.target.checked}))}
                  style={{ accentColor: 'var(--cyan)', width: 14, height: 14 }} />
                <label htmlFor="is-public" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Make this profile public (visible to all users)
                </label>
              </div>

              <button id="save-mission-btn" type="submit" className="btn btn-primary"
                disabled={saving} style={{ justifyContent: 'center' }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save Mission Profile'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Mission list ── */}
        <div>
          <div className="section-heading" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Your Missions</h3>
            <div className="section-divider" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{missions.length} profiles</span>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</p>
          ) : missions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
              <Rocket size={32} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No missions yet. Create one or use a preset!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {missions.map(m => (
                <MissionCard key={m.id} mission={m}
                  onDelete={handleDelete}
                  onSelect={setSelected}
                  selected={selected?.id === m.id} />
              ))}
            </div>
          )}

          {selected && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => navigate(`/simulate?mission=${selected.id}`)}>
                <Rocket size={13} /> Run Simulation
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => navigate(`/compare?mission=${selected.id}`)}>
                Run Comparison
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
