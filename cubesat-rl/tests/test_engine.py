import pytest
import numpy as np
from simulation.cubesat_env import CubeSatEnv

def test_cubesat_env_initialization():
    env = CubeSatEnv()
    obs, info = env.reset()
    assert len(obs) == 15 # state representation length
    
    state = env.state_dict
    assert state['m'] == 1.0 # default fuel
    assert state['b'] == 10.0 # default battery

def test_cubesat_fuel_consumption():
    env = CubeSatEnv()
    env.reset()
    
    # Apply maximum thrust (all thrusters firing max)
    action = np.array([1.0, 1.0, 1.0, 1.0])
    
    # initial fuel
    init_fuel = env.state_dict['m']
    
    obs, reward, term, trunc, info = env.step(action)
    
    # fuel should have decreased
    final_fuel = env.state_dict['m']
    assert final_fuel < init_fuel

def test_cubesat_min_altitude_termination():
    env = CubeSatEnv()
    env.reset()
    
    # Force altitude to be very low by hacking the r vector (for testing purposes)
    env.state[:3] = np.array([6000000.0, 0.0, 0.0]) # r_norm < 6371000 + 200000
    
    # Step the environment
    action = np.array([0.0, 0.0, 0.0, 0.0])
    obs, reward, term, trunc, info = env.step(action)
    
    # Should terminate immediately due to orbital decay
    assert term is True
    assert "Out of orbital bounds" in info.get("reason", "")
