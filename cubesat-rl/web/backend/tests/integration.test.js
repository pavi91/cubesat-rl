const { spawn } = require('child_process');
const path = require('path');

describe('Node-to-Python Integration via spawn', () => {
  it('successfully invokes query_db.py with action get_user_by_id', (done) => {
    // This requires the database to exist, but even if user is not found,
    // the CLI should return a valid JSON structure rather than crashing.
    const pythonRoot = path.resolve(__dirname, '..', '..', '..');
    const pythonBin = path.join(pythonRoot, 'venv', 'bin', 'python');
    const scriptPath = path.join(pythonRoot, 'api', 'query_db.py');
    
    const proc = spawn(pythonBin, [scriptPath, '--action', 'get_user_by_id', '--id', '999999'], { cwd: pythonRoot });
    
    let out = '';
    let err = '';
    
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    
    proc.on('close', code => {
      expect(code).toBe(0);
      expect(err).toBe('');
      const lines = out.trim().split('\n').filter(Boolean);
      const lastLine = lines[lines.length - 1];
      
      let parsed;
      expect(() => {
        parsed = JSON.parse(lastLine);
      }).not.toThrow();
      
      expect(parsed.ok).toBeDefined();
      done();
    });
  });
});
