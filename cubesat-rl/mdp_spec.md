MDP Specification: Autonomous 6-DOF Orbital Stabilization
Target Environment: 3D Low Earth Orbit (LEO) with Full Attitude Dynamics
Spacecraft: 1U CubeSat (10 cm x 10 cm x 10 cm)
Target Altitude: 400 km

## Overview
The orbital control task is formulated as a Partially Observable Markov Decision Process (POMDP). The agent interacts with the environment at discrete control steps, observing a noisy state estimate $\hat{s} \in S$, selecting a continuous continuous action $a \in A$ according to policy $\pi$, transitioning via a high-fidelity 3D RK4 physics engine, and receiving a composite reward $R_t$.

## 1. State Space ($S$)
The state vector is a 15-dimensional array. All variables are normalized to a $[-1, 1]$ range before being passed to the agent. Gaussian noise ($\sigma=0.005$) is added to simulate sensor inaccuracies.

**A. Translation (Position and Velocity)**
- $r_x, r_y, r_z$: 3D Position vector (normalized by 7,000 km)
- $v_x, v_y, v_z$: 3D Velocity vector (normalized by 8,000 m/s)
- Target: Maintain an orbital radius of $r_{target} = 6,771,000 \text{ m}$ and velocity of $v_{target} = 7,672 \text{ m/s}$.

**B. Attitude (Orientation and Rotation)**
- $q_0, q_1, q_2, q_3$: Attitude quaternion (naturally bound between $[-1, 1]$)
- $\omega_x, \omega_y, \omega_z$: Angular velocity vector (normalized by 0.1 rad/s)

**C. Subsystems (Mass and Power)**
- $m$: Propellant Mass (0.0 to 1.0 kg)
- $b$: Battery Charge (0.0 to 10.0 Wh). Drains at -1.0W base load, charges at +4.0W net in sunlight.

## 2. Action Space ($A$)
The action space consists of 4 continuous commands in the range $[-1, 1]$.

**A. Thrust Magnitude**
- $T_{mag}$: Outputs $>0$ scale linearly to a maximum of $10 \text{ mN}$. Thrust is applied along the body's local +Z axis, meaning the agent must rotate the spacecraft to point the thruster.

**B. Attitude Torques**
- $\tau_x, \tau_y, \tau_z$: 3-axis torques (e.g., from reaction wheels) scaled to a maximum of $10^{-4} \text{ Nm}$.

## 3. Transition Function ($T$)
The environment uses a 4th-order Runge-Kutta (RK4) integrator over 60-second steps.
- **Gravity:** Includes Earth's central body gravity and $J_2$ oblateness perturbations.
- **Aerodynamics:** Dynamic exponential atmospheric drag based on altitude.
- **Power:** Cylindrical shadow model determines eclipse phases (sunlight vs Earth's shadow).
- **Randomization:** Each episode initializes with random altitude offsets, velocity offsets, orbital angles, and initial tumbling rates.

## 4. Reward Function ($R$)
The reward function balances mission requirements at every step $t$.

**Components:**
1. **Orbital Tracking ($\hat{R}_{orbit}$):** Huber loss for distance from $r_{target}$ (transitioning from quadratic to linear error for stability).
2. **Fuel Efficiency ($\hat{R}_{fuel}$):** Linear penalty for thrust usage.
3. **Velocity Stability ($\hat{R}_{stability}$):** Linear penalty for deviation from circular velocity.
4. **Survival Bonus:** A constant $+0.01$ per step to encourage maintaining stable orbits and not depleting battery/fuel.
5. **Terminal Penalty ($\hat{R}_{penalty}$):** A $-1.0$ penalty if the satellite drops below $r_{min}$, goes above $r_{max}$, depletes its fuel, or depletes its battery.

$$R_t = 0.5 \cdot \hat{R}_{orbit} + 0.3 \cdot \hat{R}_{fuel} + 0.15 \cdot \hat{R}_{stability} + 0.05 \cdot \hat{R}_{penalty} + \text{Bonus}$$

## 5. Discount Factor ($\gamma$)
Value: $\gamma = 0.99$
Rationale: Prioritizes long-term mission survival and stability over immediate corrections.
