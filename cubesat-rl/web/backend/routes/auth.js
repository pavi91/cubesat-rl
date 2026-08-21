/**
 * Auth Routes — /api/auth
 * POST /register  — create account
 * POST /login     — returns JWT
 * GET  /me        — current user info
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { spawn } = require('child_process');
const path    = require('path');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const PYTHON_ROOT = path.resolve(__dirname, '..', '..', '..');
const PYTHON_BIN  = path.join(PYTHON_ROOT, 'venv', 'bin', 'python');

// ── helper: call a Python DB function via query_db.py ────────────────────────
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

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }
  // Only allow admin to set role; default to analyst
  const assignedRole = ['admin', 'analyst', 'viewer'].includes(role) ? role : 'analyst';
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await callDB([
      '--action', 'create_user',
      '--username', username,
      '--email', email,
      '--password_hash', passwordHash,
      '--role', assignedRole,
    ]);
    if (!result.ok) return res.status(409).json({ error: result.error || 'User already exists' });
    const token = jwt.sign(
      { id: result.data.id, username, email, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: result.data.id, username, email, role: assignedRole } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const result = await callDB(['--action', 'get_user_by_email', '--email', email]);
    if (!result.ok || !result.data) return res.status(401).json({ error: 'Invalid email or password' });
    const user = result.data;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await callDB(['--action', 'get_user_by_id', '--id', String(req.user.id)]);
    if (!result.ok) return res.status(404).json({ error: 'User not found' });
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
