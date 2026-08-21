import pytest
from api.verify import MissionVerificationService

@pytest.fixture
def base_mission():
    return {
        "target_alt_km": 450.0,
        "min_alt_km": 400.0,
        "altitude_tolerance_km": 10.0,
        "fuel_budget_kg": 1.0,
        "max_fuel_consumption_kg": 0.5,
        "power_budget_wh": 10.0,
        "max_rms_altitude_error_km": 5.0,
        "min_time_in_tolerance_percent": 90.0,
    }

def test_verify_passes_all(base_mission):
    sim_result = {
        "total_reward": 100,
        "trajectory": [
            {"step": 1, "alt_km": 452.0, "fuel_kg": 1.0, "batt_wh": 10.0},
            {"step": 2, "alt_km": 449.0, "fuel_kg": 0.9, "batt_wh": 10.0},
            {"step": 3, "alt_km": 451.0, "fuel_kg": 0.8, "batt_wh": 10.0},
        ]
    }
    
    result = MissionVerificationService.verify(base_mission, sim_result)
    
    assert result["missionSuccess"] is True
    assert result["requirementsPassed"] == 5
    assert result["requirementsFailed"] == 0
    assert result["metrics"]["time_in_tolerance_percent"] == 100.0
    assert result["metrics"]["fuel_consumed_kg"] == 0.2

def test_verify_fails_altitude(base_mission):
    sim_result = {
        "total_reward": 100,
        "trajectory": [
            {"step": 1, "alt_km": 450.0, "fuel_kg": 1.0, "batt_wh": 10.0},
            {"step": 2, "alt_km": 380.0, "fuel_kg": 0.9, "batt_wh": 10.0}, # Fails min alt
            {"step": 3, "alt_km": 390.0, "fuel_kg": 0.8, "batt_wh": 10.0}, # Fails tolerance
        ]
    }
    
    result = MissionVerificationService.verify(base_mission, sim_result)
    
    assert result["missionSuccess"] is False
    assert result["metrics"]["minimum_altitude_km"] == 380.0
    
    req_status = {r["id"]: r["passed"] for r in result["requirements"]}
    assert req_status["MR-01"] is False # Stability (only 33% in tolerance)
    assert req_status["MR-02"] is False # Min alt (<400)
    assert req_status["MR-03"] is True  # Fuel is fine

def test_verify_fails_fuel_and_power(base_mission):
    sim_result = {
        "total_reward": 100,
        "trajectory": [
            {"step": 1, "alt_km": 450.0, "fuel_kg": 1.0, "batt_wh": 10.0},
            {"step": 2, "alt_km": 450.0, "fuel_kg": 0.2, "batt_wh": 10.0}, # Fuel drop 0.8 > 0.5
            {"step": 3, "alt_km": 450.0, "fuel_kg": 0.1, "batt_wh": 0.5},  # Power violation (<1)
        ]
    }
    
    result = MissionVerificationService.verify(base_mission, sim_result)
    
    assert result["missionSuccess"] is False
    
    req_status = {r["id"]: r["passed"] for r in result["requirements"]}
    assert req_status["MR-01"] is True  # Altitude is fine
    assert req_status["MR-03"] is False # Fuel failed
    assert req_status["MR-05"] is False # Power failed
