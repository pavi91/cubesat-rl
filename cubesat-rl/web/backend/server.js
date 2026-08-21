const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const { spawn } = require('child_process');
const path     = require('path');

const { requireAuth } = require('./middleware/auth');
const authRoutes     = require('./routes/auth');
const missionRoutes  = require('./routes/missions');
const reportsRoutes  = require('./routes/reports');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Root of the Python project (two levels up from web/backend/)
const PYTHON_ROOT = path.resolve(__dirname, '..', '..');
const PYTHON_BIN  = path.join(PYTHON_ROOT, 'venv', 'bin', 'python');

// ─── Shared helper: spawn Python and collect output ───────────────────────────
function spawnPython(args, cwd = PYTHON_ROOT) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_BIN, args, { cwd });
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => code !== 0 ? reject(new Error(err)) : resolve(out));
  });
}

function queryDB(res, args) {
  const script = path.join(PYTHON_ROOT, 'api', 'query_db.py');
  spawnPython([script, ...args])
    .then(out => {
      const lines = out.trim().split('\n').filter(Boolean);
      const last  = lines[lines.length - 1];
      const result = JSON.parse(last);
      if (!result.ok) return res.status(404).json(result);
      res.json(result);
    })
    .catch(err => res.status(500).json({ error: err.message }));
}

// ─── Mounted routes ───────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/reports',  reportsRoutes);

// ─── REST: Health + Model Info ────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    model: 'PPO CubeSat 3D 6-DOF',
    architecture: '[256, 256, 256] MLP',
    observation_dims: 15,
    action_dims: 4,
    training_steps: 6200000,
    environment: 'CubeSatEnv v3.0 (RK4, J2, Drag, Eclipse)',
  });
});

// ─── REST: Run full comparison ────────────────────────────────────────────────
app.post('/api/compare', requireAuth, (req, res) => {
  const steps            = req.body.steps            || 200;
  const seed             = req.body.seed             || 42;
  const missionProfileId = req.body.mission_profile_id || null;

  const scriptArgs = [
    path.join(PYTHON_ROOT, 'api', 'run_comparison.py'),
    '--steps', steps,
    '--seed',  seed,
    '--user_id', String(req.user.id),
  ];
  if (missionProfileId) scriptArgs.push('--mission_profile_id', String(missionProfileId));

  const proc = spawn(PYTHON_BIN, scriptArgs, { cwd: PYTHON_ROOT });

  let outputBuffer = '';
  let errorBuffer  = '';
  proc.stdout.on('data', d => { outputBuffer += d.toString(); });
  proc.stderr.on('data', d => { errorBuffer  += d.toString(); });

  proc.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: errorBuffer || 'Python script failed' });
    const lines = outputBuffer.trim().split('\n').filter(Boolean);
    const doneLine = [...lines].reverse().find(l => {
      try { return JSON.parse(l).status === 'done'; } catch { return false; }
    });
    const lastLine = doneLine || lines[lines.length - 1];
    try {
      res.json(JSON.parse(lastLine));
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse Python output', raw: lastLine });
    }
  });
});

// ─── REST: History — Simulations ──────────────────────────────────────────────
app.get('/api/history/simulations', (req, res) => {
  const limit  = parseInt(req.query.limit) || 50;
  // Optional: filter by current user if ?mine=1
  const args = ['--action', 'list_simulations', '--limit', String(limit)];
  queryDB(res, args);
});

app.get('/api/history/simulations/:id', (req, res) => {
  queryDB(res, ['--action', 'get_simulation', '--id', req.params.id]);
});

app.delete('/api/history/simulations/:id', requireAuth, (req, res) => {
  queryDB(res, ['--action', 'delete_simulation', '--id', req.params.id]);
});

// ─── REST: History — Comparisons ──────────────────────────────────────────────
app.get('/api/history/comparisons', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  queryDB(res, ['--action', 'list_comparisons', '--limit', String(limit)]);
});

// ─── WebSocket: Live step-by-step simulation streaming ────────────────────────
io.on('connection', socket => {
  console.log(`Client connected: ${socket.id}`);
  let currentProcess = null;

  socket.on('start_simulation', ({ controller = 'ppo', steps = 200, missionProfileId, userId }) => {
    if (currentProcess) { currentProcess.kill(); currentProcess = null; }

    const scriptArgs = [
      path.join(PYTHON_ROOT, 'api', 'run_simulation.py'),
      '--controller', controller,
      '--steps',      steps,
    ];
    if (missionProfileId) scriptArgs.push('--mission_profile_id', String(missionProfileId));
    if (userId)           scriptArgs.push('--user_id',            String(userId));

    currentProcess = spawn(PYTHON_BIN, scriptArgs, { cwd: PYTHON_ROOT });

    let lineBuffer = '';
    currentProcess.stdout.on('data', data => {
      lineBuffer += data.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer  = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          socket.emit('simulation_data', parsed);
        } catch (_) {}
      }
    });

    currentProcess.stderr.on('data', data => {
      const msg = data.toString();
      if (msg.includes('Error') || msg.includes('Traceback')) {
        socket.emit('simulation_error', { message: msg });
      }
    });

    currentProcess.on('close', () => {
      socket.emit('simulation_complete');
      currentProcess = null;
    });
  });

  socket.on('stop_simulation', () => {
    if (currentProcess) { currentProcess.kill(); currentProcess = null; }
    socket.emit('simulation_stopped');
  });

  socket.on('disconnect', () => {
    if (currentProcess) { currentProcess.kill(); currentProcess = null; }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 CubeSat RL Backend running on http://localhost:${PORT}`);
});
