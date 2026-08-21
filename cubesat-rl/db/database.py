"""
CubeSat RL — SQLite persistence layer
Uses Python's built-in sqlite3 — no extra dependencies.

DB file location: <project_root>/cubesat_rl.db
"""
import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

# ── Path resolution ──────────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(_HERE, '..', 'cubesat_rl.db')


def _connect(path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Return a connection with row_factory set for dict-style access."""
    conn = sqlite3.connect(os.path.normpath(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")   # safe for concurrent readers
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


# ── Schema ───────────────────────────────────────────────────────────────────
_DDL = """
-- One row per simulation run
CREATE TABLE IF NOT EXISTS simulations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    controller      TEXT    NOT NULL,          -- 'ppo' | 'pid' | 'random'
    steps_requested INTEGER NOT NULL,
    steps_survived  INTEGER,
    seed            INTEGER,
    total_reward    REAL,
    fuel_consumed   REAL,
    final_alt_km    REAL,
    start_alt_km    REAL,
    start_fuel      REAL,
    created_at      TEXT    NOT NULL           -- ISO-8601 UTC
);

-- Per-step telemetry (optional detail; linked to simulations)
CREATE TABLE IF NOT EXISTS simulation_steps (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    simulation_id   INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    step            INTEGER NOT NULL,
    alt_km          REAL,
    vel_ms          REAL,
    fuel_kg         REAL,
    batt_wh         REAL,
    reward          REAL,
    total_reward    REAL,
    action          TEXT,    -- JSON array
    r_vec           TEXT,    -- JSON array [x,y,z] normalised
    q               TEXT,    -- JSON array [w,x,y,z]
    w               TEXT     -- JSON array [wx,wy,wz]
);

-- One row per PPO-vs-PID comparison run
CREATE TABLE IF NOT EXISTS comparisons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    steps_requested INTEGER NOT NULL,
    seed            INTEGER,
    ppo_reward      REAL,
    pid_reward      REAL,
    ppo_fuel        REAL,
    pid_fuel        REAL,
    ppo_final_alt   REAL,
    pid_final_alt   REAL,
    ppo_steps       INTEGER,
    pid_steps       INTEGER,
    ppo_trajectory  TEXT,    -- full JSON (list of step dicts)
    pid_trajectory  TEXT,    -- full JSON
    created_at      TEXT     NOT NULL
);

-- Optional: hyperparams + metrics for each training run
CREATE TABLE IF NOT EXISTS training_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    total_timesteps INTEGER,
    learning_rate   REAL,
    n_steps         INTEGER,
    batch_size      INTEGER,
    n_epochs        INTEGER,
    final_reward    REAL,
    model_path      TEXT,
    notes           TEXT,
    created_at      TEXT     NOT NULL
);
"""


def init_db(path: str = DEFAULT_DB_PATH) -> None:
    """Create the DB file and all tables if they don't already exist."""
    with _connect(path) as conn:
        conn.executescript(_DDL)
    print(f"[db] Initialised SQLite DB at: {os.path.normpath(path)}")


# ── Simulations ───────────────────────────────────────────────────────────────

def save_simulation(
    *,
    controller: str,
    steps_requested: int,
    steps_survived: int,
    total_reward: float,
    fuel_consumed: float,
    final_alt_km: float,
    start_alt_km: float,
    start_fuel: float,
    seed: Optional[int] = None,
    step_data: Optional[list[dict[str, Any]]] = None,
    db_path: str = DEFAULT_DB_PATH,
) -> int:
    """
    Persist a completed simulation run.
    Returns the new simulation row ID.
    """
    init_db(db_path)
    now = datetime.now(timezone.utc).isoformat()

    with _connect(db_path) as conn:
        cur = conn.execute(
            """INSERT INTO simulations
               (controller, steps_requested, steps_survived, seed,
                total_reward, fuel_consumed, final_alt_km, start_alt_km, start_fuel, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (controller, steps_requested, steps_survived, seed,
             total_reward, fuel_consumed, final_alt_km, start_alt_km, start_fuel, now),
        )
        sim_id = cur.lastrowid

        if step_data:
            rows = [
                (
                    sim_id,
                    s.get("step"),
                    s.get("alt_km"),
                    s.get("vel_ms"),
                    s.get("fuel_kg"),
                    s.get("batt_wh"),
                    s.get("reward"),
                    s.get("total_reward"),
                    json.dumps(s.get("action", [])),
                    json.dumps(s.get("r_vec", [])),
                    json.dumps(s.get("q", [])),
                    json.dumps(s.get("w", [])),
                )
                for s in step_data
            ]
            conn.executemany(
                """INSERT INTO simulation_steps
                   (simulation_id, step, alt_km, vel_ms, fuel_kg, batt_wh,
                    reward, total_reward, action, r_vec, q, w)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                rows,
            )
    return sim_id


def get_simulation_history(limit: int = 50, db_path: str = DEFAULT_DB_PATH) -> list[dict]:
    """Return the most-recent simulation runs (summary only, no step data)."""
    init_db(db_path)
    with _connect(db_path) as conn:
        rows = conn.execute(
            """SELECT id, controller, steps_requested, steps_survived, seed,
                      total_reward, fuel_consumed, final_alt_km, start_alt_km, created_at
               FROM simulations
               ORDER BY id DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_simulation_detail(sim_id: int, db_path: str = DEFAULT_DB_PATH) -> Optional[dict]:
    """Return a single simulation row plus its step-level telemetry."""
    init_db(db_path)
    with _connect(db_path) as conn:
        sim = conn.execute(
            "SELECT * FROM simulations WHERE id = ?", (sim_id,)
        ).fetchone()
        if sim is None:
            return None
        steps = conn.execute(
            """SELECT step, alt_km, vel_ms, fuel_kg, batt_wh,
                      reward, total_reward, action, r_vec, q, w
               FROM simulation_steps
               WHERE simulation_id = ?
               ORDER BY step""",
            (sim_id,),
        ).fetchall()

    step_list = []
    for s in steps:
        d = dict(s)
        for col in ("action", "r_vec", "q", "w"):
            try:
                d[col] = json.loads(d[col]) if d[col] else []
            except (json.JSONDecodeError, TypeError):
                d[col] = []
        step_list.append(d)

    result = dict(sim)
    result["steps"] = step_list
    return result


def delete_simulation(sim_id: int, db_path: str = DEFAULT_DB_PATH) -> bool:
    """Delete a simulation and its step data (CASCADE). Returns True if found."""
    init_db(db_path)
    with _connect(db_path) as conn:
        cur = conn.execute("DELETE FROM simulations WHERE id = ?", (sim_id,))
    return cur.rowcount > 0


# ── Comparisons ───────────────────────────────────────────────────────────────

def save_comparison(
    *,
    steps_requested: int,
    seed: int,
    ppo: dict,
    pid: dict,
    db_path: str = DEFAULT_DB_PATH,
) -> int:
    """
    Persist a PPO-vs-PID comparison result.
    `ppo` and `pid` are the dicts returned by run_trajectory().
    Returns the new comparison row ID.
    """
    init_db(db_path)
    now = datetime.now(timezone.utc).isoformat()
    ps, ks = ppo["summary"], pid["summary"]

    with _connect(db_path) as conn:
        cur = conn.execute(
            """INSERT INTO comparisons
               (steps_requested, seed,
                ppo_reward, pid_reward, ppo_fuel, pid_fuel,
                ppo_final_alt, pid_final_alt, ppo_steps, pid_steps,
                ppo_trajectory, pid_trajectory, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                steps_requested, seed,
                ps["total_reward"], ks["total_reward"],
                ps["fuel_consumed"], ks["fuel_consumed"],
                ps["final_alt_km"], ks["final_alt_km"],
                ps["steps_survived"], ks["steps_survived"],
                json.dumps(ppo["trajectory"]),
                json.dumps(pid["trajectory"]),
                now,
            ),
        )
    return cur.lastrowid


def get_comparison_history(limit: int = 50, db_path: str = DEFAULT_DB_PATH) -> list[dict]:
    """Return the most-recent comparison runs (without full trajectory blobs)."""
    init_db(db_path)
    with _connect(db_path) as conn:
        rows = conn.execute(
            """SELECT id, steps_requested, seed,
                      ppo_reward, pid_reward, ppo_fuel, pid_fuel,
                      ppo_final_alt, pid_final_alt, ppo_steps, pid_steps,
                      created_at
               FROM comparisons
               ORDER BY id DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]
