import os
from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.callbacks import EvalCallback
from simulation.cubesat_env import CubeSatEnv

def main():
    print("🚀 Initializing PPO Training Pipeline...")
    
    # 1. Setup Directories for logging and saving models
    log_dir = "./logs/"
    os.makedirs(log_dir, exist_ok=True)
    
    # 2. Instantiate and Monitor the Environment
    # The Monitor wrapper logs the episode rewards so we can visualize them later
    env = CubeSatEnv()
    env = Monitor(env, log_dir)
    
    # 3. Setup the PPO Agent
    # We use "MlpPolicy" because our observation space is a simple 1D array (not images)
    # The hyperparameters below are standard robust defaults for continuous control
    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,          # From your MDP specification document
        verbose=1,           # Prints training progress to the terminal
        tensorboard_log="./tensorboard_logs/"
    )
    
    # 4. Setup an Evaluation Callback
    # This automatically tests the AI every 10,000 steps and saves the best performing version
    eval_env = CubeSatEnv()
    eval_env = Monitor(eval_env)
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path='./models/best_model',
        log_path='./logs/results',
        eval_freq=10000,
        deterministic=True,
        render=False
    )
    
    # 5. Execute Training
    # 500,000 timesteps is a solid starting point for a 2D continuous control task. 
    # This should take just a few minutes on a modern CPU/GPU.
    total_timesteps = 500000
    
    print(f"\n🧠 Starting training for {total_timesteps} timesteps...")
    print("Grab a coffee, this will take a few minutes.\n")
    
    model.learn(total_timesteps=total_timesteps, callback=eval_callback)
    
    # 6. Save the final model
    model.save("./models/final_ppo_cubesat")
    print("\n✅ Training Complete! Model saved to ./models/final_ppo_cubesat.zip")

if __name__ == "__main__":
    main()