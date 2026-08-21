# Project Structure

The repository is modularized into independent layers representing the three-tier architecture:

```text
cubesat-rl/
├── api/                   # Python orchestration scripts (CLI interfaces)
│   ├── query_db.py        # Bridge script for Node.js -> SQLite 
│   ├── run_simulation.py  # Wrapper invoking physics engine and controllers
│   ├── verify.py          # Engineering verification logic (PASS/FAIL checks)
│   ├── recommend.py       # Recommendation decision engine
│   └── generate_report.py # Automated PDF generation (FPDF2)
├── simulation/            # Core Physics Engine
│   └── cubesat_env.py     # Gymnasium environment
├── baselines/             # Reference classical controllers
│   └── pid_controller.py  
├── db/                    # Data Layer
│   ├── database.py        # SQLite connection manager and migrations
│   └── cubesat_data.db    # Persistent storage (auto-generated)
├── web/                   # Web Stack
│   ├── backend/           # Node.js + Express API
│   │   ├── routes/        # Auth, Missions, Compare handlers
│   │   ├── middleware/    # JWT Authentication
│   │   ├── tests/         # Jest integration and boundary tests
│   │   └── server.js      # App entry point
│   └── frontend/          # React + Vite application
│       ├── src/
│       │   ├── pages/     # Views (Compare, MissionPlanner)
│       │   ├── components/# Reusable UI (Auth, Nav, Charts)
│       │   └── index.css  # Application styling
├── docs/                  # Software Engineering Documentation
│   ├── requirements.md    # FRs and NFRs
│   ├── traceability-matrix.md
│   ├── architecture.md    
│   └── diagrams/          # Mermaid architecture and sequence flows
├── tests/                 # Python Test Suite
│   ├── test_engine.py     # Simulation physics sanity checks
│   ├── test_verify.py     # Verification math and boundary logic
│   └── test_recommend.py  # Tie-breaking recommendation combinatorial logic
└── README.md              # Project overview and run instructions
```
