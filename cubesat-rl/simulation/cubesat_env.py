import gymnasium as gym
from gymnasium import spaces
import numpy as np
from numba import njit

# Numba optimized helper functions
@njit
def quat_multiply(q1, q2):
    w1, x1, y1, z1 = q1[0], q1[1], q1[2], q1[3]
    w2, x2, y2, z2 = q2[0], q2[1], q2[2], q2[3]
    w = w1*w2 - x1*x2 - y1*y2 - z1*z2
    x = w1*x2 + x1*w2 + y1*z2 - z1*y2
    y = w1*y2 - x1*z2 + y1*w2 + z1*x2
    z = w1*z2 + x1*y2 - y1*x2 + z1*w2
    return np.array([w, x, y, z], dtype=np.float32)

@njit
def rotate_vector(q, v):
    q_vec = np.array([0.0, v[0], v[1], v[2]], dtype=np.float32)
    q_conj = np.array([q[0], -q[1], -q[2], -q[3]], dtype=np.float32)
    res = quat_multiply(quat_multiply(q, q_vec), q_conj)
    return np.array([res[1], res[2], res[3]], dtype=np.float32)

@njit
def _derivatives_numba(state, action):
    # Physics constants
    mu = np.float32(3.986e14)
    R_E = np.float32(6371000.0)
    J2 = np.float32(1.08262668e-3)
    m_min = np.float32(0.0)
    batt_min = np.float32(0.0)
    max_thrust = np.float32(0.010)
    max_torque = np.float32(1e-4)
    inertia = np.array([0.01, 0.01, 0.01], dtype=np.float32)
    rho0 = np.float32(2.72e-12)
    h0 = np.float32(400000.0)
    H = np.float32(50000.0)
    Cd = np.float32(2.2)
    area = np.float32(0.01)
    
    r_vec = state[0:3]
    v_vec = state[3:6]
    q = state[6:10]
    w = state[10:13]
    m = state[13]
    if m < 0.1: m = np.float32(0.1)
    batt = state[14]
    
    r_norm = np.linalg.norm(r_vec)
    
    # Action mappings
    thrust_mag = np.float32(0.0)
    if action[0] > 0.0: thrust_mag = np.float32(action[0] * max_thrust)
    if state[13] <= m_min: thrust_mag = np.float32(0.0)
    
    tau = (action[1:4] * max_torque).astype(np.float32)
    if state[14] <= batt_min: tau = np.zeros(3, dtype=np.float32)
    
    # 1. Gravity with J2
    x, y, z = r_vec[0], r_vec[1], r_vec[2]
    r2 = r_norm**2
    r3 = r_norm**3
    r5 = r_norm**5
    
    gx = - (mu * x / r3) + (1.5 * mu * J2 * (R_E**2) / r5) * x * (5 * (z**2) / r2 - 1)
    gy = - (mu * y / r3) + (1.5 * mu * J2 * (R_E**2) / r5) * y * (5 * (z**2) / r2 - 1)
    gz = - (mu * z / r3) + (1.5 * mu * J2 * (R_E**2) / r5) * z * (5 * (z**2) / r2 - 3)
    g_acc = np.array([gx, gy, gz], dtype=np.float32)
    
    # 2. Aerodynamic Drag
    h = r_norm - R_E
    rho = rho0 * np.exp(-(h - h0) / H)
    v_norm = np.linalg.norm(v_vec)
    drag_force = -0.5 * rho * Cd * area * v_norm * v_vec
    drag_acc = drag_force / m
    
    # 3. Thrust
    thrust_body = np.array([0.0, 0.0, thrust_mag], dtype=np.float32)
    thrust_inertial = rotate_vector(q, thrust_body)
    thrust_acc = thrust_inertial / m
    
    # Translation Rates
    r_dot = v_vec.copy()
    v_dot = g_acc + drag_acc + thrust_acc
    
    # 4. Attitude Kinematics & Dynamics
    qw, qx, qy, qz = q[0], q[1], q[2], q[3]
    wx, wy, wz = w[0], w[1], w[2]
    
    q_dot = 0.5 * np.array([
        -qx*wx - qy*wy - qz*wz,
         qw*wx - qz*wy + qy*wz,
         qz*wx + qw*wy - qx*wz,
        -qy*wx + qx*wy + qw*wz
    ], dtype=np.float32)
    
    # Numba np.cross supports 3D arrays
    w_dot = (tau - np.cross(w, inertia * w)) / inertia
    
    # 5. Subsystems
    delta_m_max_per_sec = 0.0005 / 60.0
    m_dot = -(thrust_mag / max_thrust) * delta_m_max_per_sec
    
    in_eclipse = (x < 0) and ((y**2 + z**2) < R_E**2)
    power = -1.0
    if not in_eclipse:
        power += 5.0
        
    batt_dot = power / 3600.0
    
    res = np.empty(15, dtype=np.float32)
    res[0:3] = r_dot
    res[3:6] = v_dot
    res[6:10] = q_dot
    res[10:13] = w_dot
    res[13] = m_dot
    res[14] = batt_dot
    return res

@njit
def _rk4_step_numba(state, action, dt, sub_steps, m_min, m_max, batt_min, batt_max):
    sub_dt = np.float32(dt / sub_steps)
    half_sub_dt = np.float32(0.5 * sub_dt)
    
    for _ in range(sub_steps):
        k1 = _derivatives_numba(state, action)
        k2 = _derivatives_numba(state + half_sub_dt * k1, action)
        k3 = _derivatives_numba(state + half_sub_dt * k2, action)
        k4 = _derivatives_numba(state + sub_dt * k3, action)
        
        state = (state + (sub_dt / np.float32(6.0)) * (k1 + np.float32(2.0)*k2 + np.float32(2.0)*k3 + k4)).astype(np.float32)
        
        q = state[6:10]
        state[6:10] = (q / np.float32(np.linalg.norm(q))).astype(np.float32)
        
        if state[13] < m_min: state[13] = m_min
        if state[13] > m_max: state[13] = m_max
        if state[14] < batt_min: state[14] = batt_min
        if state[14] > batt_max: state[14] = batt_max
        
    return state

class CubeSatEnv(gym.Env):
    """Custom Environment for 3D 6-DOF CubeSat Orbital Stabilization"""
    metadata = {'render_modes': ['human']}

    def __init__(self):
        super(CubeSatEnv, self).__init__()
        
        self.action_space = spaces.Box(
            low=np.array([-1.0, -1.0, -1.0, -1.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0, 1.0], dtype=np.float32),
            dtype=np.float32
        )
        
        self.observation_space = spaces.Box(
            low=np.full(15, -1.0, dtype=np.float32),
            high=np.full(15, 1.0, dtype=np.float32),
            dtype=np.float32
        )
        
        self.r_target = 6771000.0
        self.r_min = 6571000.0  # 200 km below target -- wider bounds so agent lives longer
        self.r_max = 6971000.0  # 200 km above target
        self.d_max = 200000.0   # Normalize error over ±200 km
        
        self.v_target = 7672.0
        self.v_min = 7500.0
        self.v_max = 7800.0
        
        self.m_max = 1.0
        self.m_min = 0.0
        
        self.batt_max = 10.0
        self.batt_min = 0.0
        self.max_thrust = 0.010
        
        self.dt = 60.0
        self.state = None
        self.state_dict = {}

    def _get_obs(self):
        r_vec = self.state[0:3]
        v_vec = self.state[3:6]
        q = self.state[6:10]
        w = self.state[10:13]
        m = self.state[13]
        batt = self.state[14]
        
        r_norm = r_vec / 7000000.0
        v_norm = v_vec / 8000.0
        q_norm = q
        w_norm = w / 0.1
        m_norm = 2.0 * (m - self.m_min) / (self.m_max - self.m_min) - 1.0
        b_norm = 2.0 * (batt - self.batt_min) / (self.batt_max - self.batt_min) - 1.0
        
        obs = np.concatenate([r_norm, v_norm, q_norm, w_norm, [m_norm, b_norm]]).astype(np.float32)
        
        noise = np.random.normal(0, 0.005, size=obs.shape).astype(np.float32)
        return np.clip(obs + noise, -1.0, 1.0)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        
        altitude_offset = np.random.uniform(-10000, 10000)
        vel_offset = np.random.uniform(-20, 20)
        
        r0 = self.r_target + altitude_offset
        v0 = self.v_target + vel_offset
        
        theta = np.random.uniform(0, 2 * np.pi)
        r_vec = np.array([r0 * np.cos(theta), r0 * np.sin(theta), 0.0], dtype=np.float32)
        v_vec = np.array([-v0 * np.sin(theta), v0 * np.cos(theta), 0.0], dtype=np.float32)
        
        q = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32) 
        w = np.random.uniform(-0.01, 0.01, size=3).astype(np.float32) 
        
        self.state = np.concatenate([r_vec, v_vec, q, w, [self.m_max, self.batt_max]]).astype(np.float32)
        self.state_dict = {
            'r': r0, 'v': v0, 'm': self.m_max, 'b': self.batt_max,
            'r_vec': r_vec, 'v_vec': v_vec, 'q': q, 'w': w
        }
        
        # JIT compile warm-up
        _rk4_step_numba(self.state, np.zeros(4, dtype=np.float32), self.dt, 1, self.m_min, self.m_max, self.batt_min, self.batt_max)
        
        return self._get_obs(), {}

    def step(self, action):
        # Call the optimized Numba function
        action = action.astype(np.float32)
        self.state = _rk4_step_numba(self.state, action, self.dt, 60, self.m_min, self.m_max, self.batt_min, self.batt_max)
        
        r_vec = self.state[0:3]
        v_vec = self.state[3:6]
        q = self.state[6:10]
        w = self.state[10:13]
        m = self.state[13]
        batt = self.state[14]
        
        r_norm_val = np.linalg.norm(r_vec)
        v_norm_val = np.linalg.norm(v_vec)
        
        r_error = np.abs(r_norm_val - self.r_target)
        
        # --- PRIMARY: Dense orbital accuracy reward ---
        # Gaussian-shaped bonus: peaks at +1.0 when on target, falls off smoothly.
        # The agent gets a POSITIVE reward for being close, not just a less-negative one.
        sigma = self.d_max * 0.3  # 1-sigma ~ 60km
        r_orbit = float(np.exp(-0.5 * (r_error / sigma) ** 2))  # range [0, 1]
        
        # --- SECONDARY: Velocity tracking ---
        v_error = np.abs(v_norm_val - self.v_target)
        r_velocity = float(np.exp(-0.5 * (v_error / 100.0) ** 2))  # range [0, 1]
        
        # --- TINY FUEL PENALTY: Efficiency signal ---
        # Must be much less than orbit reward so agent burns fuel freely to stay on orbit.
        fuel_used = max(0.0, float(action[0]))
        r_fuel = -0.1 * fuel_used  # tiny penalty
        
        # Composite reward: orbit quality is dominant positive signal
        reward = (0.80 * r_orbit) + (0.15 * r_velocity) + (0.05 * r_fuel)
        
        terminated = False
        truncated = False
        r_penalty = 0.0
        info = {}
        
        self.state_dict = {
            'r': r_norm_val, 'v': v_norm_val, 'm': m, 'b': batt,
            'r_vec': r_vec, 'v_vec': v_vec, 'q': q, 'w': w
        }
        
        if r_norm_val < self.r_min or r_norm_val > self.r_max:
            terminated = True
            reward = -1.0
            info['reason'] = "Out of orbital bounds"
        
        if m <= self.m_min:
            terminated = True
            reward = -1.0
            info['reason'] = "Fuel depleted"
            
        if batt <= self.batt_min:
            terminated = True
            reward = -1.0
            info['reason'] = "Battery depleted"
            
        return self._get_obs(), reward, terminated, truncated, info