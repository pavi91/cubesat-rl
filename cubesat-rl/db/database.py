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
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


# ── Schema ───────────────────────────────────────────────────────────────────
_DDL = """
-- Users with roles
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    UNIQUE NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'analyst',  -- 'admin'|'analyst'|'viewer'
    created_at    TEXT    NOT NULL
);

-- Named mission configurations
CREATE TABLE IF NOT EXISTS mission_profiles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    description     TEXT,
    target_alt_km   REAL    NOT NULL DEFAULT 450.0,
    min_alt_km      REAL    NOT NULL DEFAULT 400.0,
    fuel_budget_kg  REAL    NOT NULL DEFAULT 1.0,
    power_budget_wh REAL    NOT NULL DEFAULT 10.0,
    steps           INTEGER NOT NULL DEFAULT 200,
    is_public       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL
);

-- One row per simulation run
CREATE TABLE IF NOT EXISTS simulations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER REFERENCES users(id),
    mission_profile_id  INTEGER REFERENCES mission_profiles(id),
    controller          TEXT    NOT NULL,
    steps_requested     INTEGER NOT NULL,
    steps_survived      INTEGER,
    seed                INTEGER,
    total_reward        REAL,
    fuel_consumed       REAL,
    final_alt_km        REAL,
    start_alt_km        REAL,
    start_fuel          REAL,
    alerts_triggered    TEXT,    -- JSON array of alert types
    created_at          TEXT    NOT NULL
);

-- Per-step telemetry
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
    action          TEXT,
    r_vec           TEXT,
    q               TEXT,
    w               TEXT
);

-- One row per PPO-vs-PID comparison run
CREATE TABLE IF NOT EXISTS comparisons (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER REFERENCES users(id),
    mission_profile_id  INTEGER REFERENCES mission_profiles(id),
    steps_requested     INTEGER NOT NULL,
    seed                INTEGER,
    ppo_reward          REAL,
    pid_reward          REAL,
    ppo_fuel            REAL,
    pid_fuel            REAL,
    ppo_final_alt       REAL,
    pid_final_alt       REAL,
    ppo_steps           INTEGER,
    pid_steps           INTEGER,
    recommendation      TEXT,    -- JSON: {winner, confidence, summary, criteria_scores, warnings}
    ppo_trajectory      TEXT,
    pid_trajectory      TEXT,
    created_at          TEXT    NOT NULL
);

-- Generated reports
CREATE TABLE IF NOT EXISTS reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    comparison_id   INTEGER REFERENCES comparisons(id),
    file_path       TEXT,
    format          TEXT    NOT NULL DEFAULT 'pdf',
    created_at      TEXT    NOT NULL
);

-- Training runs (optional metadata)
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
    created_at      TEXT    NOT NULL
);
"""


def init_db(path: str = DEFAULT_DB_PATH) -> None:
    """Create the DB file and all tables if they don't already exist."""
    with _connect(path) as conn:
        conn.executescript(_DDL)


# ── Users ─────────────────────────────────────────────────────────────────────

def create_user(*, username: str, email: str, password_hash: str,
                role: str = 'analyst', db_path: str = DEFAULT_DB_PATH) -> int:
    init_db(db_path)
    now = datetime.now(timezone.utc).isoformat()
    with _connect(db_path) as conn:
        cur = conn.execute(
            "INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?,?,?,?,?)",
            (username, email, password_hash, role, now),
        )
    return cur.lastrowid


def get_user_by_email(email: str, db_path: str = DEFAULT_DB_PATH) -> Optional[dict]:
    init_db(db_path)
    with _connect(db_path) as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: int, db_path: str = DEFAULT_DB_PATH) -> Optional[dict]:
    init_db(db_path)
    with _connect(db_path) as conn:
        row = conn.execute("SELECT id, username, email, role, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def get_user_by_username(username: str, db_path: str = DEFAULT_DB_PATH) -> Optional[dict]:
    init_db(db_path)
    with _connect(db_path) as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return dict(row) if row else None


# ── Mission Profiles ──────────────────────────────────────────────────────────

def create_mission_profile(*, user_id: int, name: str, description: str = '',
                            target_alt_km: float = 450.0, min_alt_km: float = 400.0,
                            fuel_budget_kg: float = 1.0, power_budget_wh: float = 10.0,
                            steps: int = 200, is_public: bool = False,
                            db_path: str = DEFAULT_DB_PATH) -> int:
    init_db(db_path)
    now = datetime.now(timezone.utc).isoformat()
    with _connect(db_path) as conn:
        cur = conn.execute(
            """INSERT INTO mission_profiles
               (user_id, name, description, target_alt_km, min_alt_km,
                fuel_budget_kg, power_budget_wh, steps, is_public, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (user_id, name, description, target_alt_km, min_alt_km,
             fuel_budget_kg, power_budget_wh, steps, int(is_public), now),
        )
    return cur.lastrowid


def get_mission_profiles(user_id: int, db_path: str = DEFAULT_DB_PATH) -> list[dict]:
    """Return missions owned by user + all public missions."""
    init_db(db_path)
    with _connect(db_path) as conn:
        rows = conn.execute(
            """SELECT mp.*, u.username as owner_username
               FROM mission_profiles mp
               JOIN users u ON u.id = mp.user_id
               WHERE mp.user_id = ? OR mp.is_public = 1
               ORDER BY mp.id DESC""",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_mission_profile(profile_id: int, db_path: str = DEFAULT_DB_PATH) -> Optional[dict]:
    init_db(db_path)
    with _connect(db_path) as conn:
        row = conn.execute(
            "SELECT mp.*, u.username as owner_username FROM mission_profiles mp JOIN users u ON u.id = mp.user_id WHERE mp.id = ?",
            (profile_id,),
        ).fetchone()
    return dict(row) if row else None


def update_mission_profile(profile_id: int, user_id: int, fields: dict,
                            db_path: str = DEFAULT_DB_PATH) -> bool:
    allowed = {'name', 'description', 'target_alt_km', 'min_alt_km',
               'fuel_budget_kg', 'power_budget_wh', 'steps', 'is_public'}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return False
    init_db(db_path)
    set_clause = ', '.join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [profile_id, user_id]
    with _connect(db_path) as conn:
        cur = conn.execute(
            f"UPDATE mission_profiles SET {set_clause} WHERE id = ? AND user_id = ?",
            values,
        )
    return cur.rowcount > 0


def delete_mission_profile(profile_id: int, user_id: int,
                            db_path: str = DEFAULT_DB_PATH) -> bool:
    init_db(db_path)
    with _connect(db_path) as conn:
        cur = conn.execute(
            "DELETE FROM mission_profiles WHERE id = ? AND user_id = ?",
            (profile_id, user_id),
        )
    return cur.rowcount > 0


# ── Simulations ───────────────────────────────────────────────────────────────

def save_simulation(*, controller: str, steps_requested: int, steps_survived: int,
                    total_reward: float, fuel_consumed: float, final_alt_km: float,
                    start_alt_km: float, start_fuel: float,
                    user_id: Optional[int] = None,
                    mission_profile_id: Optional[int] = None,
                    seed: Optional[int] = None,
                    alerts_triggered: Optional[list] = None,
                    step_data: Optional[list[dict[str, Any]]] = None,
                    db_path: str = DEFAULT_DB_PATH) -> int:
    init_db(db_path)
    now = datetime.now(timezone.utc).isoformat()
    with _connect(db_path) as conn:
        cur = conn.execute(
            """INSERT INTO simulations
               (user_id, mission_profile_id, controller, steps_requested, steps_survived,
                seed, total_reward, fuel_consumed, final_alt_km, start_alt_km,
                start_fuel, alerts_triggered, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user_id, mission_profile_id, controller, steps_requested, steps_survived,
             seed, total_reward, fuel_consumed, final_alt_km, start_alt_km,
             start_fuel, json.dumps(alerts_triggered or []), now),
        )
        sim_id = cur.lastrowid

        if step_data:
            rows = [
                (sim_id, s.get("step"), s.get("alt_km"), s.get("vel_ms"),
                 s.get("fuel_kg"), s.get("batt_wh"), s.get("reward"),
                 s.get("total_reward"), json.dumps(s.get("action", [])),
                 json.dumps(s.get("r_vec", [])), json.dumps(s.get("q", [])),
                 json.dumps(s.get("w", [])))
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


def get_simulation_history(limit: int = 50, user_id: Optional[int] = None,
                            db_path: str = DEFAULT_DB_PATH) -> list[dict]:
    init_db(db_path)
    where = "WHERE s.user_id = ?" if user_id else ""
    params = (user_id, limit) if user_id else (limit,)
    with _connect(db_path) as conn:
        rows = conn.execute(
            f"""SELECT s.id, s.controller, s.steps_requested, s.steps_survived,
                       s.total_reward, s.fuel_consumed, s.final_alt_km,
                       s.start_alt_km, s.alerts_triggered, s.created_at,
                       u.username, mp.name as mission_name
                FROM simulations s
                LEFT JOIN users u ON u.id = s.user_id
                LEFT JOIN mission_profiles mp ON mp.id = s.mission_profile_id
                {where}
                ORDER BY s.id DESC LIMIT ?""",
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def get_simulation_detail(sim_id: int, db_path: str = DEFAULT_DB_PATH) -> Optional[dict]:
    init_db(db_path)
    with _connect(db_path) as conn:
        sim = conn.execute("SELECT * FROM simulations WHERE id = ?", (sim_id,)).fetchone()
        if sim is None:
            return None
        steps = conn.execute(
            """SELECT step, alt_km, vel_ms, fuel_kg, batt_wh,
                      reward, total_reward, action, r_vec, q, w
               FROM simulation_steps WHERE simulation_id = ? ORDER BY step""",
            (sim_id,),
        ).fetchall()

    result = dict(sim)
    step_list = []
    for s in steps:
        d = dict(s)
        for col in ("action", "r_vec", "q", "w"):
            try:
                d[col] = json.loads(d[col]) if d[col] else []
            except (json.JSONDecodeError, TypeError):
                d[col] = []
        step_list.append(d)
    result["steps"] = step_list
    return result


def delete_simulation(sim_id: int, db_path: str = DEFAULT_DB_PATH) -> bool:
    init_db(db_path)
    with _connect(db_path) as conn:
        cur = conn.execute("DELETE FROM simulations WHERE id = ?", (sim_id,))
    return cur.rowcount > 0


# ── Comparisons ───────────────────────────────────────────────────────────────

def save_comparison(*, steps_requested: int, seed: int, ppo: dict, pid: dict,
                    user_id: Optional[int] = None,
                    mission_profile_id: Optional[int] = None,
                    recommendation: Optional[dict] = None,
                    db_path: str = DEFAULT_DB_PATH) -> int:
    init_db(db_path)
    now = datetime.now(timezone.utc).isoformat()
    ps, ks = ppo["summary"], pid["summary"]
    with _connect(db_path) as conn:
        cur = conn.execute(
            """INSERT INTO comparisons
               (user_id, mission_profile_id, steps_requested, seed,
                ppo_reward, pid_reward, ppo_fuel, pid_fuel,
                ppo_final_alt, pid_final_alt, ppo_steps, pid_steps,
                recommendation, ppo_trajectory, pid_trajectory, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user_id, mission_profile_id, steps_requested, seed,
             ps["total_reward"], ks["total_reward"],
             ps["fuel_consumed"], ks["fuel_consumed"],
             ps["final_alt_km"], ks["final_alt_km"],
             ps["steps_survived"], ks["steps_survived"],
             json.dumps(recommendation or {}),
             json.dumps(ppo["trajectory"]), json.dumps(pid["trajectory"]),
             now),
        )
    return cur.lastrowid


def get_comparison_history(limit: int = 50, user_id: Optional[int] = None,
                            db_path: str = DEFAULT_DB_PATH) -> list[dict]:
    init_db(db_path)
    where = "WHERE c.user_id = ?" if user_id else ""
    params = (user_id, limit) if user_id else (limit,)
    with _connect(db_path) as conn:
        rows = conn.execute(
            f"""SELECT c.id, c.steps_requested, c.seed,
                       c.ppo_reward, c.pid_reward, c.ppo_fuel, c.pid_fuel,
                       c.ppo_final_alt, c.pid_final_alt, c.ppo_steps, c.pid_steps,
                       c.recommendation, c.created_at,
                       u.username, mp.name as mission_name
                FROM comparisons c
                LEFT JOIN users u ON u.id = c.user_id
                LEFT JOIN mission_profiles mp ON mp.id = c.mission_profile_id
                {where}
                ORDER BY c.id DESC LIMIT ?""",
            params,
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d['recommendation'] = json.loads(d['recommendation']) if d['recommendation'] else {}
        except Exception:
            d['recommendation'] = {}
        result.append(d)
    return result
