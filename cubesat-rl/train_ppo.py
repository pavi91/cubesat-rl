import os
from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.callbacks import EvalCallback
from stable_baselines3.common.vec_env import SubprocVecEnv
from stable_baselines3.common.env_util import make_vec_env
from simulation.cubesat_env import CubeSatEnv
from gymnasium.wrappers import TimeLimit

def main():
    print("🚀 Initializing PPO Training Pipeline...")
    
    # 1. Setup Directories for logging and saving models
    log_dir = "./logs/"
    os.makedirs(log_dir, exist_ok=True)
    
    # 2. Instantiate and Monitor the Environment
    # We use 8 parallel environments and limit episodes to 2000 steps to prevent infinite evaluation loops.
    def make_env():
        return TimeLimit(CubeSatEnv(), max_episode_steps=2000)
        
    env = make_vec_env(make_env, n_envs=8, vec_env_cls=SubprocVecEnv, monitor_dir=log_dir)
    
    # 3. Setup the PPO Agent
    # We use "MlpPolicy" because our observation space is a 1D array.
    # We upgrade the network architecture to [256, 256, 256] to handle the 15D POMDP state.
    policy_kwargs = dict(net_arch=dict(pi=[256, 256, 256], vf=[256, 256, 256]))
    
    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=1e-4,      # Lower lr for more stable convergence (was 3e-4)
        n_steps=4096,
        batch_size=128,
        n_epochs=10,
        gamma=0.99,
        clip_range=0.1,          # Tighter clip prevents runaway updates (was 0.2)
        target_kl=0.01,          # Early-stop policy update if KL diverges
        policy_kwargs=policy_kwargs,
        verbose=1,
        tensorboard_log="./tensorboard_logs/"
    )
    
    # 4. Setup an Evaluation Callback
    # This automatically tests the AI every 10,000 steps and saves the best performing version
    eval_env = TimeLimit(CubeSatEnv(), max_episode_steps=2000)
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
    # 5,000,000 timesteps with tuned hyperparameters for stable convergence.
    total_timesteps = 5000000
    
    print(f"\n🧠 Starting training for {total_timesteps} timesteps...")
    print("Grab a coffee, this will take a few minutes.\n")
    
    model.learn(total_timesteps=total_timesteps, callback=eval_callback)
    
    # 6. Save the final model
    model.save("./models/final_ppo_cubesat")
    print("\n✅ Training Complete! Model saved to ./models/final_ppo_cubesat.zip")

if __name__ == "__main__":
    main()