from simulation.cubesat_env import CubeSatEnv
import numpy as np

env = CubeSatEnv()
env.reset()
for i in range(3):
    action = env.action_space.sample()
    obs, r, t, tr, info = env.step(action)
    print(f"Step {i+1}: r_norm={np.linalg.norm(env.state[0:3])}, v_norm={np.linalg.norm(env.state[3:6])}")
    print(f"w_norm={np.linalg.norm(env.state[10:13])}, q={env.state[6:10]}")
