import numpy as np

class PDController:
    """
    Classical PD Baseline Controller for the CubeSat Environment.
    Formula: a_t = K_p(r_target - r_t) + K_d(v_target - v_t)
    """
    def __init__(self, kp=0.005, kd=0.01):
        # Gain matrices (Tuned for our specific 10mN thruster and altitude scale)
        self.kp = kp
        self.kd = kd

    def get_action(self, env_state):
        """
        Calculates the continuous thrust action [-1, 1] based on physical state.
        """
        r = env_state['r']
        v = env_state['v']
        
        # Target constants
        r_target = 6771000.0
        v_target = 7672.0
        
        # Calculate errors
        error_r = r_target - r
        error_v = v_target - v
        
        # Calculate corrective signal
        control_signal = (self.kp * error_r) + (self.kd * error_v)
        
        # Map the control signal to the Gym Action Space [Magnitude, Angle]
        if control_signal > 0:
            # We are too low/slow. Need to add energy.
            # Magnitude: Scale signal to [0, 1] limit.
            mag_action = min(1.0, control_signal)
            # Angle: 0.0 maps to 0 radians (Pushing perfectly forward/tangentially)
            angle_action = 0.0 
        else:
            # We are too high/fast.
            # Because atmospheric drag naturally slows us down, the most fuel-efficient 
            # classical response is to simply turn the thruster off and let drag do the work.
            mag_action = -1.0 # Translates to 0 thrust in the environment
            angle_action = 0.0
            
        return np.array([mag_action, angle_action], dtype=np.float32)