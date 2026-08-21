#!/usr/bin/env python3
"""
CubeSat RL Portal — Simulation API Bridge
Streams per-step telemetry as JSON lines to stdout.
Usage: python run_simulation.py --controller [ppo|pid|random] --steps 200
"""
import sys
import os
import json
import argparse
import numpy as np

# Add parent directory to path so we can import cubesat + db modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import save_simulation, get_mission_profile
from simulation.cubesat_env import CubeSatEnv
from baselines.pid_controller import PDController


def run_simulation(controller_type: str, steps: int, alt_offset: float = 0.0,
                   user_id=None, mission_profile_id=None):
    env = CubeSatEnv()
    mission_profile = get_mission_profile(mission_profile_id) if mission_profile_id else None
    
    # Alert thresholds
    min_alt_km = mission_profile['min_alt_km'] if mission_profile else 400.0
    fuel_budget = mission_profile['fuel_budget_kg'] if mission_profile else 1.0
    power_budget = mission_profile['power_budget_wh'] if mission_profile else 10.0

    # Apply optional altitude offset via env params
    obs, info = env.reset()

    # Load model if PPO
    ppo_model = None
    if controller_type == 'ppo':
        try:
            from stable_baselines3 import PPO
            model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models', 'final_ppo_cubesat')
            ppo_model = PPO.load(model_path)
        except Exception as e:
            print(json.dumps({"error": f"Failed to load PPO model: {e}"}), flush=True)
            return

    pid = PDController() if controller_type == 'pid' else None

    total_reward = 0.0
    starting_fuel = env.state_dict['m']

    # Emit initial state
    state = env.state_dict
    r_norm = float(np.linalg.norm(state['r_vec'])) if 'r_vec' in state else state['r']
    start_alt_km = round((r_norm - 6371000) / 1000, 2)
    print(json.dumps({
        "type": "init",
        "controller": controller_type,
        "steps": steps,
        "start_alt": start_alt_km,
        "start_fuel": round(float(state['m']), 5),
        "start_batt": round(float(state['b']), 3),
    }), flush=True)

    step_history = []   # collected for DB persistence
    triggered_alerts = set()

    for step in range(steps):
        # Choose action
        if controller_type == 'ppo':
            action, _ = ppo_model.predict(obs, deterministic=True)
        elif controller_type == 'pid':
            action = pid.get_action(env.state_dict)
        else:
            action = env.action_space.sample()

        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += float(reward)

        state = env.state_dict
        r_norm = float(np.linalg.norm(state['r_vec'])) if 'r_vec' in state else float(state['r'])
        v_norm = float(np.linalg.norm(state['v_vec'])) if 'v_vec' in state else float(state['v'])
        r_vec = state['r_vec'].tolist() if 'r_vec' in state else [0, 0, 0]
        q = state['q'].tolist() if 'q' in state else [1, 0, 0, 0]
        w = state['w'].tolist() if 'w' in state else [0, 0, 0]

        alt_km = round((r_norm - 6371000) / 1000, 3)
        fuel_kg = round(float(state['m']), 5)
        batt_wh = round(float(state['b']), 3)
        
        step_alerts = []
        if alt_km < min_alt_km:
            step_alerts.append({"type": "ORBITAL_DECAY", "severity": "critical", "message": f"Altitude {alt_km:.1f}km is below minimum {min_alt_km}km"})
            triggered_alerts.add("ORBITAL_DECAY")
        
        # Critical fuel: < 10% of budget
        if fuel_kg < (fuel_budget * 0.1):
            step_alerts.append({"type": "CRITICAL_FUEL", "severity": "warning", "message": f"Fuel at {(fuel_kg/fuel_budget)*100:.1f}% of budget"})
            triggered_alerts.add("CRITICAL_FUEL")
            
        if batt_wh < (power_budget * 0.1):
            step_alerts.append({"type": "POWER_FAILURE", "severity": "critical", "message": "Battery critical"})
            triggered_alerts.add("POWER_FAILURE")

        step_data = {
            "type": "step",
            "step": step + 1,
            "alt_km": alt_km,
            "vel_ms": round(v_norm, 2),
            "fuel_kg": fuel_kg,
            "batt_wh": batt_wh,
            "reward": round(float(reward), 4),
            "total_reward": round(total_reward, 4),
            "action": [round(float(a), 3) for a in action],
            "r_vec": [round(x / 7e6, 5) for x in r_vec],  # normalized for 3D viz
            "q": [round(x, 4) for x in q],
            "w": [round(x, 4) for x in w],
            "terminated": bool(terminated),
            "info": info,
            "alerts": step_alerts,
        }
        print(json.dumps(step_data), flush=True)
        step_history.append(step_data)

        if terminated or truncated:
            break

    fuel_consumed = float(starting_fuel) - float(state['m'])
    final_alt = round((r_norm - 6371000) / 1000, 3)
    steps_survived = step + 1

    print(json.dumps({
        "type": "done",
        "total_reward": round(total_reward, 4),
        "fuel_consumed": round(fuel_consumed, 5),
        "final_alt": final_alt,
        "steps_survived": steps_survived,
    }), flush=True)

    # ── Persist to SQLite ────────────────────────────────────────────────────
    try:
        sim_id = save_simulation(
            controller=controller_type,
            steps_requested=steps,
            steps_survived=steps_survived,
            total_reward=round(total_reward, 4),
            fuel_consumed=round(fuel_consumed, 5),
            final_alt_km=final_alt,
            start_alt_km=start_alt_km,
            start_fuel=round(float(starting_fuel), 5),
            user_id=user_id,
            mission_profile_id=mission_profile_id,
            alerts_triggered=list(triggered_alerts),
            step_data=step_history,
        )
        print(json.dumps({"type": "saved", "sim_id": sim_id}), flush=True)
    except Exception as _db_err:
        # DB errors must never crash the simulation output
        print(json.dumps({"type": "db_warn", "message": str(_db_err)}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--controller',         type=str,   default='ppo', choices=['ppo', 'pid', 'random'])
    parser.add_argument('--steps',              type=int,   default=200)
    parser.add_argument('--alt_offset',         type=float, default=0.0)
    parser.add_argument('--user_id',            type=int,   default=None)
    parser.add_argument('--mission_profile_id', type=int,   default=None)
    args = parser.parse_args()
    run_simulation(args.controller, args.steps, args.alt_offset,
                   user_id=args.user_id, mission_profile_id=args.mission_profile_id)
