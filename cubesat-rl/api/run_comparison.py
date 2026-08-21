#!/usr/bin/env python3
"""
CubeSat RL Portal — Comparison API Bridge
Runs PPO vs PID simultaneously for the same number of steps and outputs a
single JSON object with both trajectories.
"""
import sys
import os
import json
import argparse
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import save_comparison

from simulation.cubesat_env import CubeSatEnv
from baselines.pid_controller import PDController

def run_trajectory(controller_type: str, steps: int, seed: int = 42):
    env = CubeSatEnv()
    obs, _ = env.reset(seed=seed)

    ppo_model = None
    if controller_type == 'ppo':
        from stable_baselines3 import PPO
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models', 'final_ppo_cubesat')
        ppo_model = PPO.load(model_path)

    pid = PDController() if controller_type == 'pid' else None

    trajectory = []
    total_reward = 0.0
    starting_fuel = float(env.state_dict['m'])

    for step in range(steps):
        if controller_type == 'ppo':
            action, _ = ppo_model.predict(obs, deterministic=True)
        else:
            action = pid.get_action(env.state_dict)

        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += float(reward)

        state = env.state_dict
        r_norm = float(np.linalg.norm(state['r_vec']))
        v_norm = float(np.linalg.norm(state['v_vec']))

        trajectory.append({
            "step": step + 1,
            "alt_km": round((r_norm - 6371000) / 1000, 3),
            "vel_ms": round(v_norm, 2),
            "fuel_kg": round(float(state['m']), 5),
            "batt_wh": round(float(state['b']), 3),
            "reward": round(float(reward), 4),
            "cumulative_reward": round(total_reward, 4),
            "action": [round(float(a), 3) for a in action],
            "r_vec": [round(x / 7e6, 5) for x in state['r_vec'].tolist()],
        })

        if terminated or truncated:
            break

    fuel_consumed = starting_fuel - float(state['m'])
    return {
        "controller": controller_type,
        "trajectory": trajectory,
        "summary": {
            "total_reward": round(total_reward, 4),
            "fuel_consumed": round(fuel_consumed, 5),
            "final_alt_km": round((float(np.linalg.norm(state['r_vec'])) - 6371000) / 1000, 3),
            "steps_survived": step + 1,
        }
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--steps', type=int, default=200)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    print(json.dumps({"status": "loading", "message": "Loading models..."}), flush=True)

    ppo_result = run_trajectory('ppo', args.steps, args.seed)
    pid_result = run_trajectory('pid', args.steps, args.seed)

    output = {
        "status": "done",
        "steps": args.steps,
        "ppo": ppo_result,
        "pid": pid_result,
    }
    print(json.dumps(output), flush=True)

    # ── Persist to SQLite ────────────────────────────────────────────────────
    try:
        cmp_id = save_comparison(
            steps_requested=args.steps,
            seed=args.seed,
            ppo=ppo_result,
            pid=pid_result,
        )
        print(json.dumps({"status": "saved", "cmp_id": cmp_id}), flush=True)
    except Exception as _db_err:
        print(json.dumps({"status": "db_warn", "message": str(_db_err)}), flush=True)
