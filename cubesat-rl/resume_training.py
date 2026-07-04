import os
from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.callbacks import EvalCallback
from stable_baselines3.common.vec_env import SubprocVecEnv
from stable_baselines3.common.env_util import make_vec_env
from simulation.cubesat_env import CubeSatEnv
from gymnasium.wrappers import TimeLimit

def main():
    print("🚀 Resuming PPO Training from best checkpoint...")
    
    log_dir = "./logs/"
    os.makedirs(log_dir, exist_ok=True)

    def make_env():
        return TimeLimit(CubeSatEnv(), max_episode_steps=2000)

    env = make_vec_env(make_env, n_envs=8, vec_env_cls=SubprocVecEnv, monitor_dir=log_dir)

    # Load the best checkpoint from the interrupted 5M run
    checkpoint_path = "./models/best_model/best_model.zip"
    print(f"Loading checkpoint: {checkpoint_path}")
    model = PPO.load(checkpoint_path, env=env)

    # Keep the same stable hyperparameters from the last run
    model.learning_rate = 1e-4
    model.clip_range = lambda _: 0.1
    model.target_kl = 0.01

    # Setup eval callback
    eval_env = Monitor(TimeLimit(CubeSatEnv(), max_episode_steps=2000))
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path='./models/best_model',
        log_path='./logs/results',
        eval_freq=10000,
        deterministic=True,
        render=False
    )

    # Resume for 2.5M more steps (completing the intended 5M total)
    remaining_timesteps = 2500000
    print(f"\n🧠 Resuming training for {remaining_timesteps} more timesteps...")
    print("This completes the intended 5M step training run.\n")

    model.learn(total_timesteps=remaining_timesteps, callback=eval_callback, reset_num_timesteps=False)

    model.save("./models/final_ppo_cubesat")
    print("\n✅ Training Complete! Model saved to ./models/final_ppo_cubesat.zip")

if __name__ == "__main__":
    main()
