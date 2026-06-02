import gymnasium as gym
from gymnasium import spaces
import numpy as np

class CubeSatEnv(gym.Env):
    """Custom Environment for 2D CubeSat Orbital Stabilization"""
    metadata = {'render_modes': ['human']}

    def __init__(self):
        super(CubeSatEnv, self).__init__()
        
        # --- 1. ACTION SPACE ---
        self.action_space = spaces.Box(
            low=np.array([-1.0, -1.0], dtype=np.float32),
            high=np.array([1.0, 1.0], dtype=np.float32),
            dtype=np.float32
        )
        
        # --- 2. OBSERVATION SPACE (STATE) ---
        self.observation_space = spaces.Box(
            low=np.array([-1.0, -1.0, -1.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0], dtype=np.float32),
            dtype=np.float32
        )
        
        # --- 3. PHYSICS & MDP CONSTANTS ---
        self.r_target = 6771000.0
        self.r_min = 6721000.0
        self.r_max = 6821000.0
        self.d_max = 50000.0
        
        self.v_target = 7672.0
        self.v_min = 7500.0
        self.v_max = 7800.0
        
        self.m_max = 1.0
        self.m_min = 0.0
        
        self.max_thrust = 0.010  
        
        self.state = None

    def _get_obs(self):
        r_norm = 2.0 * (self.state['r'] - self.r_min) / (self.r_max - self.r_min) - 1.0
        v_norm = 2.0 * (self.state['v'] - self.v_min) / (self.v_max - self.v_min) - 1.0
        m_norm = 2.0 * (self.state['m'] - self.m_min) / (self.m_max - self.m_min) - 1.0
        
        return np.array([r_norm, v_norm, m_norm], dtype=np.float32)

    # --- UPDATED: reset now accepts seed/options and returns obs AND info ---
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        
        self.state = {
            'r': self.r_target,
            'v': self.v_target,
            'm': self.m_max
        }
        return self._get_obs(), {}

    def step(self, action):
        dt = 60.0  
        
        r = self.state['r']
        v = self.state['v']
        m = self.state['m']
        
        thrust_mag = max(0.0, action[0]) * self.max_thrust
        thrust_angle = action[1] * np.pi
        
        mu = 3.986e14       
        rho = 2.72e-12      
        Cd = 2.2            
        area = 0.01         
        
        gravity = mu / (r ** 2)
        centripetal = (v ** 2) / r
        
        drag_force = 0.5 * rho * Cd * area * (v ** 2)
        drag_accel = drag_force / max(m, 0.1) 
        
        thrust_accel = thrust_mag / max(m, 0.1)
        radial_thrust = thrust_accel * np.sin(thrust_angle)
        tangential_thrust = thrust_accel * np.cos(thrust_angle)
        
        radial_accel = centripetal - gravity + radial_thrust
        r_new = r + (radial_accel * dt ** 2) 
        
        v_new = v + (tangential_thrust - drag_accel) * dt
        
        delta_m_max = 0.0005 
        delta_m = (thrust_mag / self.max_thrust) * delta_m_max
        m_new = max(self.m_min, m - delta_m)
        
        self.state = {'r': r_new, 'v': v_new, 'm': m_new}
        
        r_orbit = -((r_new - self.r_target) ** 2) / (self.d_max ** 2)
        r_fuel = -(delta_m / delta_m_max)
        r_stability = -((v_new - self.v_target) ** 2) / ((self.v_max - self.v_target) ** 2)
        
        # --- UPDATED: 'done' is split into 'terminated' and 'truncated' ---
        terminated = False
        truncated = False
        r_penalty = 0.0
        info = {}
        
        if r_new < self.r_min or r_new > self.r_max:
            terminated = True
            r_penalty = -1.0 
            info['reason'] = "Out of orbital bounds"
        
        if m_new <= self.m_min:
            terminated = True
            r_penalty = -1.0
            info['reason'] = "Fuel depleted"
            
        reward = (0.5 * r_orbit) + (0.3 * r_fuel) + (0.15 * r_stability) + (0.05 * r_penalty)
        
        return self._get_obs(), reward, terminated, truncated, info