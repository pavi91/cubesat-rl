const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

const PYTHON_ROOT = path.resolve(__dirname, '..', '..', '..');
const PYTHON_BIN  = path.join(PYTHON_ROOT, 'venv', 'bin', 'python');

function spawnPython(args, cwd = PYTHON_ROOT) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_BIN, args, { cwd });
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
        if (code !== 0) {
            reject(new Error(err));
        } else {
            resolve(out);
        }
    });
  });
}

// Generate PDF Report for a given Comparison ID
router.post('/generate', requireAuth, async (req, res) => {
  const { comparison_id } = req.body;
  
  if (!comparison_id) {
    return res.status(400).json({ error: 'comparison_id is required' });
  }

  try {
    const script = path.join(PYTHON_ROOT, 'api', 'generate_report.py');
    const args = ['--comparison_id', comparison_id.toString(), '--user_id', req.user.id.toString()];
    
    const out = await spawnPython([script, ...args]);
    
    // find the last JSON line
    const lines = out.trim().split('\n').filter(Boolean);
    const last = lines[lines.length - 1];
    
    let result;
    try {
        result = JSON.parse(last);
    } catch (e) {
        return res.status(500).json({ error: 'Failed to parse python output', output: out });
    }
    
    if (!result.ok) {
        return res.status(500).json({ error: result.error || 'Failed to generate report' });
    }
    
    res.json(result);
  } catch (err) {
    console.error("Report Generation Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Download PDF by ID
router.get('/:id/download', requireAuth, (req, res) => {
    // In a real app we'd query DB for file_path, but here we construct it
    // since we know the pattern: report_<cmp_id>.pdf
    // Wait, the endpoint expects comparison_id here.
    const comparison_id = req.params.id;
    const file_path = path.join(PYTHON_ROOT, 'reports', `report_${comparison_id}.pdf`);
    
    if (fs.existsSync(file_path)) {
        res.download(file_path);
    } else {
        res.status(404).json({ error: 'Report not found' });
    }
});

module.exports = router;
