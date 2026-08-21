import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
      borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem',
    }}>
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', marginBottom: '0.3rem' }}>
        STEP {label}
      </p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: '0.75rem', fontFamily: 'var(--font-display)' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function ChartCard({ title, children, height = 180 }) {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        {title}
      </p>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export default function LiveCharts({ history, color = 'var(--cyan)' }) {
  if (!history || history.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
        <p>Charts will appear as simulation runs...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <ChartCard title="ALTITUDE (km)">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="step" stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={400} stroke="rgba(0,212,255,0.3)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'var(--cyan)', fontSize: 10 }} />
          <Line type="monotone" dataKey="alt_km" name="Alt" stroke={color} dot={false} strokeWidth={2} />
        </LineChart>
      </ChartCard>

      <ChartCard title="CUMULATIVE REWARD">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="step" stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Line type="monotone" dataKey="total_reward" name="Reward" stroke="var(--green)" dot={false} strokeWidth={2} />
        </LineChart>
      </ChartCard>

      <ChartCard title="FUEL REMAINING (kg)" height={140}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="step" stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis stroke="none" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={['auto', 1.01]} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="fuel_kg" name="Fuel" stroke="var(--yellow)" dot={false} strokeWidth={2} />
        </LineChart>
      </ChartCard>
    </div>
  );
}
