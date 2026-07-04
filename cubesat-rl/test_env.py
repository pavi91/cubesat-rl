from simulation.cubesat_env import CubeSatEnv
import numpy as np

def main():
    print("🚀 Initializing 3D 6-DOF CubeSat Environment...")
    env = CubeSatEnv()
    
    # Reset to starting conditions
    obs, info = env.reset()
    start_alt_km = (env.state_dict['r'] - 6371000) / 1000
    
    print(f"Starting Observation shape: {obs.shape}")
    print(f"Starting Physical Altitude: {start_alt_km:.2f} km")
    print(f"Starting Fuel: {env.state_dict['m']:.2f} kg")
    print(f"Starting Battery: {env.state_dict['b']:.2f} Wh")
    print("-" * 50)
    
    print("Running 10 steps with random actions...\n")
    
    for step in range(1, 11):
        # 1. Generate a completely random action
        action = env.action_space.sample()
        
        # 2. Pass it to your physics engine
        obs, reward, terminated, truncated, info = env.step(action)
        
        # 3. Extract readable physical numbers to print
        alt_km = (env.state_dict['r'] - 6371000) / 1000
        vel = env.state_dict['v']
        fuel = env.state_dict['m']
        batt = env.state_dict['b']
        
        print(f"Step {step} | Action: [Thrust: {action[0]:.2f}, Torques: {action[1]:.2f}, {action[2]:.2f}, {action[3]:.2f}]")
        print(f"   ↳ Alt: {alt_km:.2f} km | Vel: {vel:.2f} m/s | Fuel: {fuel:.5f} kg | Batt: {batt:.2f} Wh")
        print(f"   ↳ Reward: {reward:.4f}")
        
        if terminated or truncated:
            print(f"\n⚠️ Episode terminated early! Reason: {info.get('reason', 'Unknown')}")
            break
            
    print("\n✅ Test complete. The 3D physics engine is alive!")

if __name__ == "__main__":
    main()