from stable_baselines3 import PPO
from simulation.cubesat_env import CubeSatEnv
from baselines.pid_controller import PDController

def run_evaluation(env, agent=None, controller=None, steps=2000):
    """Runs a strict evaluation loop for a given number of steps."""
    obs, info = env.reset()
    
    total_reward = 0
    starting_fuel = env.state_dict['m']
    
    for _ in range(steps):
        if agent:
            # PPO Agent Decision
            action, _states = agent.predict(obs, deterministic=True)
        else:
            # Classical PID Decision
            action = controller.get_action(env.state_dict)
            
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        
        if terminated or truncated:
            break
            
    fuel_consumed = starting_fuel - env.state_dict['m']
    final_alt_km = (env.state_dict['r'] - 6371000) / 1000
    
    return total_reward, fuel_consumed, final_alt_km

def main():
    print("⚖️ Initializing 33-Hour Stress Test...")
    
    env = CubeSatEnv()
    pid = PDController()
    
    print("Loading Trained PPO Model...")
    ppo_model = PPO.load("./models/final_ppo_cubesat")
    
    # Increased to 2,000 steps to force long-term orbital decay
    test_steps = 4000 
    print(f"\nRunning {test_steps}-step head-to-head comparison...\n")
    print("This simulates ~33 hours of continuous orbital drag.")
    
    # 1. Evaluate PID Baseline
    print("--- 🤖 CLASSICAL PID BASELINE ---")
    pid_reward, pid_fuel, pid_alt = run_evaluation(env, controller=pid, steps=test_steps)
    print(f"Total Reward:   {pid_reward:.4f}")
    print(f"Fuel Consumed:  {pid_fuel:.5f} kg")
    print(f"Final Altitude: {pid_alt:.3f} km\n")
    
    # 2. Evaluate PPO Agent
    print("--- 🧠 PPO RL AGENT ---")
    ppo_reward, ppo_fuel, ppo_alt = run_evaluation(env, agent=ppo_model, steps=test_steps)
    print(f"Total Reward:   {ppo_reward:.4f}")
    print(f"Fuel Consumed:  {ppo_fuel:.5f} kg")
    print(f"Final Altitude: {ppo_alt:.3f} km\n")
    
    # 3. The Verdict
    print("--- 🏆 THE VERDICT ---")
    if ppo_fuel < pid_fuel:
        # Prevent division by zero if PID somehow used 0 fuel
        if pid_fuel > 0:
            diff = ((pid_fuel - ppo_fuel) / pid_fuel) * 100
            print(f"PPO was MORE fuel efficient by {diff:.1f}%!")
        else:
            print("Both controllers used 0 fuel.")
    elif ppo_fuel > pid_fuel:
        print("PID was more fuel efficient.")
    else:
        print("It was a perfect tie in fuel efficiency.")

if __name__ == "__main__":
    main()