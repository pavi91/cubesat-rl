from simulation.cubesat_env import CubeSatEnv

def main():
    print("🚀 Initializing CubeSat Environment...")
    env = CubeSatEnv()
    
    # Reset to starting conditions
    obs = env.reset()
    start_alt_km = (env.state['r'] - 6371000) / 1000
    
    print(f"Starting Normalized Obs: {obs}")
    print(f"Starting Physical Altitude: {start_alt_km:.2f} km")
    print(f"Starting Fuel: {env.state['m']:.2f} kg")
    print("-" * 50)
    
    print("Running 10 steps with random thruster fires...\n")
    
    for step in range(1, 11):
        # 1. Generate a completely random action
        action = env.action_space.sample()
        
        # 2. Pass it to your physics engine
        obs, reward, done, info = env.step(action)
        
        # 3. Extract readable physical numbers to print
        alt_km = (env.state['r'] - 6371000) / 1000
        vel = env.state['v']
        fuel = env.state['m']
        
        print(f"Step {step} | Action: [Mag: {action[0]:.2f}, Ang: {action[1]:.2f}]")
        print(f"   ↳ Alt: {alt_km:.2f} km | Vel: {vel:.2f} m/s | Fuel: {fuel:.5f} kg")
        print(f"   ↳ Reward: {reward:.4f}")
        
        if done:
            print(f"\n⚠️ Episode terminated early! Reason: {info.get('reason')}")
            break
            
    print("\n✅ Test complete. The physics engine is alive!")

if __name__ == "__main__":
    main()