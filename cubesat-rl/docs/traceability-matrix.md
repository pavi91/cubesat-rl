# Requirements Traceability Matrix

This document maps the Functional Requirements (FR) defined in `requirements.md` to specific system components and automated tests, ensuring complete coverage and verification.

| Requirement ID | Description | Primary Component(s) | Verification / Test Case |
| :--- | :--- | :--- | :--- |
| **FR-01.1** | Create mission profiles | `db/database.py:create_mission_profile`, `routes/missions.js` | `tests/mission.test.js: accepts a valid payload` |
| **FR-01.2-01.6** | Define mission constraints | `Missions.jsx`, `routes/missions.js` | `tests/mission.test.js` (boundary rejection tests) |
| **FR-02.1-02.3** | Simulate PPO and PID | `api/run_simulation.py`, `cubesat_env.py` | `tests/test_engine.py` |
| **FR-02.4** | Record telemetry | `api/run_simulation.py` | `tests/test_engine.py` |
| **FR-03.1** | Evaluate constraints | `api/verify.py:MissionVerificationService` | `tests/test_verify.py: test_verify_passes_all` |
| **FR-03.2** | Verify min altitude | `api/verify.py` | `tests/test_verify.py: test_verify_fails_altitude` |
| **FR-03.3** | Verify fuel consumption | `api/verify.py` | `tests/test_verify.py: test_verify_fails_fuel_and_power` |
| **FR-03.4** | Verify RMS altitude error | `api/verify.py` | `tests/test_verify.py: test_verify_fails_altitude` |
| **FR-03.5** | Verify time in tolerance | `api/verify.py` | `tests/test_verify.py: test_verify_fails_altitude` |
| **FR-03.6** | Verify power constraints | `api/verify.py` | `tests/test_verify.py: test_verify_fails_fuel_and_power` |
| **FR-03.7** | Generate structured JSON | `api/verify.py` | `tests/test_verify.py` |
| **FR-04.1** | Recommend PPO on PID fail | `api/recommend.py:generate_recommendation` | `tests/test_recommend.py: test_recommend_ppo_passes_pid_fails` |
| **FR-04.2** | Recommend PID on PPO fail | `api/recommend.py:generate_recommendation` | `tests/test_recommend.py: test_recommend_pid_passes_ppo_fails` |
| **FR-04.3** | Recommend neither on both fail | `api/recommend.py:generate_recommendation` | `tests/test_recommend.py: test_recommend_both_fail` |
| **FR-04.4** | Tie-break on secondary metrics | `api/recommend.py:generate_recommendation` | `tests/test_recommend.py: test_recommend_both_pass_ppo_wins_fuel` |
| **FR-05.1** | UI side-by-side comparison | `web/frontend/src/pages/Compare.jsx` | Manual UI Testing |
| **FR-05.2** | PDF Report export | `api/generate_report.py` | Manual UI Testing |

## Test Coverage Summary
- **Backend / Integration:** Verified via Node.js (`jest`) covering endpoint parameter validation and DB bridging.
- **Verification Logic:** Verified via Python (`pytest`) covering pure requirements metric extraction and evaluation logic.
- **Recommendation Logic:** Verified via Python (`pytest`) covering all combinatorial tie-breaking rules.
- **Engine Physics:** Verified via Python (`pytest`) covering fuel decrement and catastrophic boundary checks.
