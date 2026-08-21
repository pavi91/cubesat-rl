/**
 * Mission Profile Routes — /api/missions
 * GET    /          — list my missions + public ones
 * POST   /          — create mission profile
 * GET    /:id       — get single profile
 * PUT    /:id       — update (owner only)
 * DELETE /:id       — delete (owner only)
 */
const express = require('express');
const { spawn } = require('child_process');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const PYTHON_ROOT = path.resolve(__dirname, '..', '..', '..');
const PYTHON_BIN  = path.join(PYTHON_ROOT, 'venv', 'bin', 'python');

function callDB(args) {
  return new Promise((resolve, reject) => {
    const script = path.join(PYTHON_ROOT, 'api', 'query_db.py');
    const proc = spawn(PYTHON_BIN, [script, ...args], { cwd: PYTHON_ROOT });
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(err || 'Python error'));
      try {
        const lines = out.trim().split('\n').filter(Boolean);
        resolve(JSON.parse(lines[lines.length - 1]));
      } catch (e) {
        reject(new Error('Failed to parse DB output'));
      }
    });
  });
}

// All mission routes require auth
router.use(requireAuth);

// GET /api/missions
router.get('/', async (req, res) => {
  try {
    const result = await callDB(['--action', 'list_missions', '--user_id', String(req.user.id)]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/missions
router.post('/', async (req, res) => {
  const { name, description, target_alt_km, min_alt_km, fuel_budget_kg, power_budget_wh, steps, is_public } = req.body;
  if (!name) return res.status(400).json({ error: 'Mission name is required' });
  try {
    const result = await callDB([
      '--action', 'create_mission',
      '--user_id',         String(req.user.id),
      '--name',            name,
      '--description',     description || '',
      '--target_alt_km',   String(target_alt_km  ?? 450),
      '--min_alt_km',      String(min_alt_km     ?? 400),
      '--fuel_budget_kg',  String(fuel_budget_kg ?? 1.0),
      '--power_budget_wh', String(power_budget_wh ?? 10.0),
      '--steps',           String(steps           ?? 200),
      '--is_public',       is_public ? '1' : '0',
    ]);
    if (!result.ok) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/missions/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await callDB(['--action', 'get_mission', '--id', req.params.id]);
    if (!result.ok) return res.status(404).json(result);
    // Viewer can see public missions or their own
    const m = result.data;
    if (!m.is_public && m.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/missions/:id
router.put('/:id', async (req, res) => {
  try {
    const result = await callDB([
      '--action', 'update_mission',
      '--id',      req.params.id,
      '--user_id', String(req.user.id),
      '--fields',  JSON.stringify(req.body),
    ]);
    if (!result.ok) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/missions/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await callDB([
      '--action', 'delete_mission',
      '--id',      req.params.id,
      '--user_id', String(req.user.id),
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
