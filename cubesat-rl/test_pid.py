from simulation.cubesat_env import CubeSatEnv
from baselines.pid_controller import PDController

def main():
    print("🚀 Initializing CubeSat Environment with PD Controller...")
    env = CubeSatEnv()
    controller = PDController() # Using default tuned gains
    
    env.reset()
    
    total_reward = 0
    steps_survived = 0
    
    print("-" * 50)
    print("Simulating 200 steps (Approx 3.3 hours of orbit)...\n")
    
    for step in range(1, 201):
        # 1. Ask the PD controller what to do based on the true physical state
        action = controller.get_action(env.state)
        
        # 2. Pass action to physics engine
        obs, reward, done, info = env.step(action)
        
        total_reward += reward
        steps_survived += 1
        
        # Print an update every 20 steps so we don't spam the console
        if step % 20 == 0:
            alt_km = (env.state['r'] - 6371000) / 1000
            vel = env.state['v']
            fuel = env.state['m']
            print(f"Step {step:3} | Alt: {alt_km:.3f} km | Vel: {vel:.2f} m/s | Fuel: {fuel:.4f} kg | Action Mag: {action[0]:.2f}")
            
        if done:
            print(f"\n⚠️ Episode terminated at step {step}! Reason: {info.get('reason')}")
            break

    print("-" * 50)
    print(f"✅ Baseline Test Complete.")
    print(f"Total Steps Survived: {steps_survived} / 200")
    print(f"Total Episode Reward: {total_reward:.4f}")
    print(f"Final Fuel Remaining: {env.state['m']:.4f} kg")

if __name__ == "__main__":
    main()