const express = require('express');
const request = require('supertest');
const missionsRouter = require('../routes/missions');

// We'll mock the auth middleware to always inject a dummy user
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'analyst' };
    next();
  }
}));

// We'll mock child_process spawn to intercept DB calls in callDB, 
// but since the validation happens before the DB call, we don't strictly 
// need a working DB for validation failures! We can just catch the 400s.
const { spawn } = require('child_process');
jest.mock('child_process');

describe('Mission Planner Validations', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/missions', missionsRouter);
    jest.clearAllMocks();
    
    spawn.mockReturnValue({
      stdout: { on: jest.fn((event, cb) => cb('{"ok": true, "data": {"id": 1}}\n')) },
      stderr: { on: jest.fn() },
      on: jest.fn((event, cb) => {
        if (event === 'close') cb(0);
      })
    });
  });

  const validPayload = {
    name: 'Test Mission',
    target_alt_km: 450,
    min_alt_km: 400,
    altitude_tolerance_km: 10,
    fuel_budget_kg: 1.0,
    max_fuel_consumption_kg: 0.5,
    power_budget_wh: 10.0,
    max_rms_altitude_error_km: 5.0,
    min_time_in_tolerance_percent: 95.0,
    steps: 200,
    is_public: false
  };

  it('accepts a valid payload', async () => {
    const res = await request(app).post('/api/missions').send(validPayload);
    expect(res.status).toBe(201);
  });

  it('rejects target_alt_km <= 0', async () => {
    const res = await request(app).post('/api/missions').send({ ...validPayload, target_alt_km: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Target altitude');
  });

  it('rejects min_alt_km < 0', async () => {
    const res = await request(app).post('/api/missions').send({ ...validPayload, min_alt_km: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Minimum safe altitude');
  });

  it('rejects fuel consumption > fuel budget', async () => {
    const res = await request(app).post('/api/missions').send({ ...validPayload, fuel_budget_kg: 1.0, max_fuel_consumption_kg: 1.5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cannot exceed mission fuel budget');
  });

  it('rejects min time out of bounds', async () => {
    let res = await request(app).post('/api/missions').send({ ...validPayload, min_time_in_tolerance_percent: -1 });
    expect(res.status).toBe(400);
    
    res = await request(app).post('/api/missions').send({ ...validPayload, min_time_in_tolerance_percent: 101 });
    expect(res.status).toBe(400);
  });
  
  it('rejects missing name', async () => {
    const { name, ...noNamePayload } = validPayload;
    const res = await request(app).post('/api/missions').send(noNamePayload);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Mission name is required');
  });
});
