import math
from typing import Dict, Any

class MissionVerificationService:
    @staticmethod
    def verify(mission_profile: Dict[str, Any], sim_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates engineering metrics from a simulation result and validates them
        against the mission profile requirements.
        Returns a structured dictionary with metrics and a PASS/FAIL requirements array.
        """
        trajectory = sim_result.get('trajectory', [])
        if not trajectory:
            return {"error": "No trajectory data available"}

        target_alt_km = mission_profile.get('target_alt_km', 450.0)
        min_alt_km = mission_profile.get('min_alt_km', 400.0)
        alt_tol = mission_profile.get('altitude_tolerance_km', 10.0)
        fuel_budget = mission_profile.get('fuel_budget_kg', 1.0)
        max_fuel_consumption = mission_profile.get('max_fuel_consumption_kg', 0.5)
        power_budget = mission_profile.get('power_budget_wh', 10.0)
        max_rms_error = mission_profile.get('max_rms_altitude_error_km', 5.0)
        min_time_pct = mission_profile.get('min_time_in_tolerance_percent', 95.0)

        # ─── Calculate Metrics ───
        alts = [step['alt_km'] for step in trajectory]
        min_alt = min(alts)
        max_alt = max(alts)
        mean_alt = sum(alts) / len(alts)
        
        sq_errors = [(a - target_alt_km)**2 for a in alts]
        rms_error = math.sqrt(sum(sq_errors) / len(sq_errors))
        
        # Time in tolerance
        lower_bound = target_alt_km - alt_tol
        upper_bound = target_alt_km + alt_tol
        steps_in_tol = sum(1 for a in alts if lower_bound <= a <= upper_bound)
        time_in_tol_pct = (steps_in_tol / len(alts)) * 100

        # Fuel and Power
        initial_fuel = trajectory[0]['fuel_kg']
        final_fuel = trajectory[-1]['fuel_kg']
        fuel_consumed = initial_fuel - final_fuel
        
        power_violations = sum(1 for step in trajectory if step['batt_wh'] < (power_budget * 0.1))
        
        total_reward = sim_result.get('total_reward', 0.0)

        metrics = {
            "minimum_altitude_km": round(min_alt, 3),
            "maximum_altitude_km": round(max_alt, 3),
            "mean_altitude_km": round(mean_alt, 3),
            "rms_altitude_error_km": round(rms_error, 3),
            "time_in_tolerance_percent": round(time_in_tol_pct, 1),
            "fuel_consumed_kg": round(fuel_consumed, 5),
            "fuel_remaining_kg": round(final_fuel, 5),
            "power_violation_count": power_violations,
            "total_reward": round(total_reward, 3)
        }

        # ─── Evaluate Requirements ───
        reqs = []

        # MR-01: Altitude Stability (Time in Tolerance)
        passed_time = time_in_tol_pct >= min_time_pct
        reqs.append({
            "id": "MR-01",
            "name": "Altitude Stability",
            "requirement": f"Remain within ±{alt_tol} km of {target_alt_km} km for at least {min_time_pct}% of time",
            "actual": f"{time_in_tol_pct:.1f}%",
            "passed": passed_time
        })

        # MR-02: Minimum Safe Altitude
        passed_min_alt = min_alt >= min_alt_km
        reqs.append({
            "id": "MR-02",
            "name": "Minimum Safe Altitude",
            "requirement": f"Altitude must never fall below {min_alt_km} km",
            "actual": f"{min_alt:.1f} km",
            "passed": passed_min_alt
        })

        # MR-03: Fuel Consumption
        passed_fuel = fuel_consumed <= max_fuel_consumption
        reqs.append({
            "id": "MR-03",
            "name": "Fuel Consumption",
            "requirement": f"Fuel consumption must not exceed {max_fuel_consumption} kg",
            "actual": f"{fuel_consumed:.5f} kg",
            "passed": passed_fuel
        })

        # MR-04: Altitude RMS Error
        passed_rms = rms_error <= max_rms_error
        reqs.append({
            "id": "MR-04",
            "name": "Altitude RMS Error",
            "requirement": f"RMS altitude error must not exceed {max_rms_error} km",
            "actual": f"{rms_error:.3f} km",
            "passed": passed_rms
        })

        # MR-05: Power Constraint
        passed_power = power_violations == 0
        reqs.append({
            "id": "MR-05",
            "name": "Power Constraint",
            "requirement": "Controller must remain within safe power levels",
            "actual": f"{power_violations} violations" if power_violations > 0 else "No violations",
            "passed": passed_power
        })

        passed_count = sum(1 for r in reqs if r["passed"])
        
        return {
            "metrics": metrics,
            "requirements": reqs,
            "requirementsPassed": passed_count,
            "requirementsFailed": len(reqs) - passed_count,
            "totalRequirements": len(reqs),
            "missionSuccess": passed_count == len(reqs)
        }
