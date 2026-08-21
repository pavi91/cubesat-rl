# System Architecture

## Overview
The CubeSat Mission Design & Verification Platform is designed as a three-tier architecture that integrates a modern web interface, an intermediary backend, and a Python-based physical simulation engine.

## 1. Web Frontend (Presentation Layer)
- **Framework:** React + Vite
- **Routing:** React Router v6
- **State Management:** React Context (for Authentication)
- **Data Visualization:** Recharts (2D telemetry plots), custom Three.js integration (3D orbit simulation)
- **Responsibility:** Mission configuration, visualizing comparisons, plotting trajectory results, real-time socket ingestion.

## 2. API Backend (Orchestration Layer)
- **Framework:** Node.js + Express
- **Authentication:** JWT (JSON Web Tokens)
- **Real-Time:** Socket.IO
- **Responsibility:** Authenticates requests, validates user input, manages database access (via a Python bridge script), and orchestrates long-running simulation jobs using standard `child_process.spawn`.

## 3. Physics & Verification Engine (Application Layer)
- **Language/Core:** Python 3, NumPy, Stable Baselines3, Gymnasium
- **Components:**
  - **Environment (`simulation/cubesat_env.py`):** Physics logic handling gravity, drag, thrust vectors, and battery degradation.
  - **Controllers:** Pre-trained PPO agent and rule-based PID baseline.
  - **Verification Engine (`api/verify.py`):** Analyzes raw trajectory arrays to compute metrics (RMS error, tolerance boundaries) and evaluate strict engineering constraints.
  - **Recommendation Engine (`api/recommend.py`):** Applies tie-breaking rules and combinatorial logic to suggest the optimal controller.

## 4. Data Layer
- **Store:** SQLite 3 (`db/cubesat_data.db`)
- **Bridge:** `api/query_db.py` exposes DB operations as a CLI invoked by Node.js.
- **Responsibility:** Persisting user accounts, mission requirements, full simulation telemetry arrays, and engineering verification results.

## Key Architectural Decisions
- **Why Node + Python?** Node.js excels at asynchronous HTTP handling and real-time WebSockets, while Python has a monopoly on robust Reinforcement Learning and scientific computing libraries. Bridging them via CLI/stdout allows leveraging the strengths of both without complex inter-process RPC frameworks like gRPC.
- **Requirements-Based Verification:** Instead of picking the "best" reinforcement learning reward (which is often arbitrary and non-physical), the system decouples verification into an independent layer that tests physical parameters (fuel kg, altitude km) against explicit mission tolerances.
