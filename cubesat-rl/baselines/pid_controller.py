import numpy as np

def quat_multiply(q1, q2):
    w1, x1, y1, z1 = q1
    w2, x2, y2, z2 = q2
    w = w1*w2 - x1*x2 - y1*y2 - z1*z2
    x = w1*x2 + x1*w2 + y1*z2 - z1*y2
    y = w1*y2 - x1*z2 + y1*w2 + z1*x2
    z = w1*z2 + x1*y2 - y1*x2 + z1*w2
    return np.array([w, x, y, z], dtype=np.float32)

def rotate_vector(q, v):
    q_vec = np.array([0, v[0], v[1], v[2]], dtype=np.float32)
    q_conj = np.array([q[0], -q[1], -q[2], -q[3]], dtype=np.float32)
    res = quat_multiply(quat_multiply(q, q_vec), q_conj)
    return res[1:4]

class PDController:
    """
    Classical PD Baseline Controller for the 6-DOF CubeSat Environment.
    Implements a cascaded controller:
    1. Outer Loop: Orbit altitude/velocity control (Thrust)
    2. Inner Loop: Attitude control (Torques) to align thrust vector with velocity.
    """
    def __init__(self, kp_orbit=0.005, kd_orbit=0.01, kp_att=1.0, kd_att=5.0):
        self.kp_orbit = kp_orbit
        self.kd_orbit = kd_orbit
        self.kp_att = kp_att
        self.kd_att = kd_att

    def get_action(self, env_state):
        """
        Calculates the continuous thrust action [thrust, tx, ty, tz] based on physical state.
        """
        # Outer Loop: Orbit Control
        r = env_state['r']
        v = env_state['v']
        r_target = 6771000.0
        v_target = 7672.0
        
        error_r = r_target - r
        error_v = v_target - v
        control_signal = (self.kp_orbit * error_r) + (self.kd_orbit * error_v)
        
        if control_signal > 0:
            mag_action = min(1.0, control_signal)
            # Need to increase energy, point thrust along velocity vector
            target_dir = env_state['v_vec'] / np.linalg.norm(env_state['v_vec'])
        else:
            mag_action = -1.0 # Turn off thruster
            # Point thrust opposite to velocity vector (just as a stable target)
            target_dir = -env_state['v_vec'] / np.linalg.norm(env_state['v_vec'])
            
        # Inner Loop: Attitude Control
        q = env_state['q']
        w = env_state['w']
        
        # Thruster is aligned with the body +Z axis [0, 0, 1]
        # Current thrust direction in inertial frame
        current_dir = rotate_vector(q, np.array([0, 0, 1]))
        
        # Cross product gives the rotation axis in inertial frame and sin(theta) magnitude
        error_axis_inertial = np.cross(current_dir, target_dir)
        
        # We need the error in the body frame to apply correct torques
        # Rotate back using the conjugate (inverse) of the quaternion
        q_conj = np.array([q[0], -q[1], -q[2], -q[3]])
        error_axis_body = rotate_vector(q_conj, error_axis_inertial)
        
        # PD control for attitude torques
        torques = (self.kp_att * error_axis_body) - (self.kd_att * w)
        
        # Map torques to [-1, 1] action space (max_torque is 1e-4)
        # We just clip them to the gym action bounds
        torques_action = np.clip(torques, -1.0, 1.0)
            
        return np.array([mag_action, torques_action[0], torques_action[1], torques_action[2]], dtype=np.float32)