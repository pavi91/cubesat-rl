import pytest
from api.recommend import generate_recommendation

def create_verify_result(passed_all=True, failed_count=0, fuel=0.1, rms=1.0):
    return {
        "missionSuccess": passed_all,
        "requirementsFailed": failed_count,
        "requirements": [
            {"name": "FakeReq", "passed": not (failed_count > 0)}
        ],
        "metrics": {
            "fuel_consumed_kg": fuel,
            "rms_altitude_error_km": rms
        }
    }

def test_recommend_ppo_passes_pid_fails():
    ppo = create_verify_result(passed_all=True, failed_count=0)
    pid = create_verify_result(passed_all=False, failed_count=1)
    
    rec = generate_recommendation(ppo, pid)
    assert rec["winner"] == "PPO_RECOMMENDED"
    assert rec["confidence"] == "high"

def test_recommend_pid_passes_ppo_fails():
    ppo = create_verify_result(passed_all=False, failed_count=1)
    pid = create_verify_result(passed_all=True, failed_count=0)
    
    rec = generate_recommendation(ppo, pid)
    assert rec["winner"] == "PID_RECOMMENDED"
    assert rec["confidence"] == "high"

def test_recommend_both_fail():
    ppo = create_verify_result(passed_all=False, failed_count=2)
    pid = create_verify_result(passed_all=False, failed_count=1)
    
    rec = generate_recommendation(ppo, pid)
    assert rec["winner"] == "NO_CONTROLLER_RECOMMENDED"
    assert "PPO failed requirements" in rec["warnings"][0]
    assert "PID failed requirements" in rec["warnings"][1]

def test_recommend_both_pass_ppo_wins_fuel():
    # PPO is more fuel efficient (0.1 vs 0.2)
    ppo = create_verify_result(passed_all=True, fuel=0.1, rms=1.0)
    pid = create_verify_result(passed_all=True, fuel=0.2, rms=1.0)
    
    rec = generate_recommendation(ppo, pid)
    assert rec["winner"] == "PPO_RECOMMENDED"
    assert rec["confidence"] == "medium"
    assert rec["criteria_scores"]["fuel"] == "ppo"

def test_recommend_both_pass_pid_wins_rms():
    # PID has better RMS (0.5 vs 1.0)
    ppo = create_verify_result(passed_all=True, fuel=0.1, rms=1.0)
    pid = create_verify_result(passed_all=True, fuel=0.1, rms=0.5)
    
    rec = generate_recommendation(ppo, pid)
    assert rec["winner"] == "PID_RECOMMENDED"
    assert rec["confidence"] == "medium"
    assert rec["criteria_scores"]["rms"] == "pid"

def test_recommend_both_pass_inconclusive():
    # Exactly identical
    ppo = create_verify_result(passed_all=True, fuel=0.1, rms=1.0)
    pid = create_verify_result(passed_all=True, fuel=0.1, rms=1.0)
    
    rec = generate_recommendation(ppo, pid)
    assert rec["winner"] == "INCONCLUSIVE"
    assert rec["confidence"] == "low"
    assert rec["criteria_scores"]["fuel"] == "tie"
    assert rec["criteria_scores"]["rms"] == "tie"
