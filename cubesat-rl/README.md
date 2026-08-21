# CubeSat Mission Design & Verification Platform

This repository houses a full-stack engineering platform designed for the planning, simulation, and strict requirements-based verification of CubeSat station-keeping controllers.

## Key Capabilities

1. **Mission Profiles:** Engineers can define mission parameters including Target Altitude, Tolerance bounds, Fuel Budgets, and Maximum allowable RMS tracking errors.
2. **Physics Simulation:** A Gymnasium-based physics engine (`cubesat_env.py`) simulates orbital dynamics, drag, thrust vectors, and mass degradation.
3. **Controller Comparison:** Simultaneously evaluate a pre-trained Reinforcement Learning agent (PPO) against a classical baseline controller (PID).
4. **Engineering Verification:** Decouples pure RL reward from engineering safety by independently validating the simulation trajectory against the user-defined mission profile. Evaluates strict constraints (Min Altitude, Time in Tolerance, Max Fuel Consumption).
5. **Decision Recommendation:** Outputs a confident recommendation (e.g., `PPO_RECOMMENDED`, `PID_RECOMMENDED`, or `NO_CONTROLLER_RECOMMENDED`) based on pass/fail validation logic and secondary metric tie-breakers.

## Architecture & Technology Stack

- **Frontend:** React, Vite, Recharts, Three.js
- **Backend:** Node.js, Express, Socket.IO
- **Simulation/Verification:** Python 3, Stable Baselines 3, Pytest
- **Database:** SQLite 3

See `/docs` for detailed Architecture, Requirements, and Traceability documentation.

## Running Locally

1. **Start the Database & Python Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Start the Node Backend**
   ```bash
   cd web/backend
   npm install
   npm run dev
   ```
3. **Start the React Frontend**
   ```bash
   cd web/frontend
   npm install
   npm run dev
   ```
