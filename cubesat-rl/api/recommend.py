from typing import Dict, Any

def generate_recommendation(ppo_verify: Dict[str, Any], pid_verify: Dict[str, Any]) -> Dict[str, Any]:
    """
    Overhauled Recommendation Engine (Phase 3).
    Evaluates the structured output from MissionVerificationService.
    """
    ppo_passed_all = ppo_verify.get('missionSuccess', False)
    pid_passed_all = pid_verify.get('missionSuccess', False)

    ppo_failed = ppo_verify.get('requirementsFailed', 0)
    pid_failed = pid_verify.get('requirementsFailed', 0)

    ppo_metrics = ppo_verify.get('metrics', {})
    pid_metrics = pid_verify.get('metrics', {})

    ppo_fuel = ppo_metrics.get('fuel_consumed_kg', float('inf'))
    pid_fuel = pid_metrics.get('fuel_consumed_kg', float('inf'))

    ppo_rms = ppo_metrics.get('rms_altitude_error_km', float('inf'))
    pid_rms = pid_metrics.get('rms_altitude_error_km', float('inf'))

    recommendation = {
        "winner": "INCONCLUSIVE",
        "confidence": "low",
        "summary": "Insufficient data to make a recommendation.",
        "criteria_scores": {},
        "warnings": []
    }

    # Extract failed requirements for the summary
    ppo_failed_reqs = [r['name'] for r in ppo_verify.get('requirements', []) if not r['passed']]
    pid_failed_reqs = [r['name'] for r in pid_verify.get('requirements', []) if not r['passed']]

    if ppo_failed > 0:
        recommendation['warnings'].append(f"PPO failed requirements: {', '.join(ppo_failed_reqs)}")
    if pid_failed > 0:
        recommendation['warnings'].append(f"PID failed requirements: {', '.join(pid_failed_reqs)}")

    # ─── Decision Logic ───
    if ppo_passed_all and not pid_passed_all:
        recommendation['winner'] = "PPO_RECOMMENDED"
        recommendation['confidence'] = "high"
        recommendation['summary'] = "PPO satisfied all mission requirements, whereas PID failed to meet engineering constraints."
        recommendation['criteria_scores']['requirements'] = 'ppo'

    elif pid_passed_all and not ppo_passed_all:
        recommendation['winner'] = "PID_RECOMMENDED"
        recommendation['confidence'] = "high"
        recommendation['summary'] = "PID satisfied all mission requirements, whereas PPO failed to meet engineering constraints."
        recommendation['criteria_scores']['requirements'] = 'pid'

    elif not ppo_passed_all and not pid_passed_all:
        recommendation['winner'] = "NO_CONTROLLER_RECOMMENDED"
        recommendation['confidence'] = "high"
        recommendation['summary'] = "Both controllers failed critical mission requirements. Mission profile redesign or controller retuning is required."
        recommendation['criteria_scores']['requirements'] = 'none'

    elif ppo_passed_all and pid_passed_all:
        # Both passed, differentiate on secondary engineering metrics
        recommendation['criteria_scores']['requirements'] = 'tie'
        
        # Compare Fuel
        if ppo_fuel < pid_fuel * 0.95:  # PPO is at least 5% more efficient
            recommendation['criteria_scores']['fuel'] = 'ppo'
        elif pid_fuel < ppo_fuel * 0.95:
            recommendation['criteria_scores']['fuel'] = 'pid'
        else:
            recommendation['criteria_scores']['fuel'] = 'tie'

        # Compare RMS Error
        if ppo_rms < pid_rms * 0.95:
            recommendation['criteria_scores']['rms'] = 'ppo'
        elif pid_rms < ppo_rms * 0.95:
            recommendation['criteria_scores']['rms'] = 'pid'
        else:
            recommendation['criteria_scores']['rms'] = 'tie'

        # Count tie-breakers
        ppo_score = sum(1 for v in recommendation['criteria_scores'].values() if v == 'ppo')
        pid_score = sum(1 for v in recommendation['criteria_scores'].values() if v == 'pid')

        if ppo_score > pid_score:
            recommendation['winner'] = "PPO_RECOMMENDED"
            recommendation['confidence'] = "medium"
            recommendation['summary'] = "Both controllers passed all requirements. PPO is recommended due to superior secondary engineering performance."
        elif pid_score > ppo_score:
            recommendation['winner'] = "PID_RECOMMENDED"
            recommendation['confidence'] = "medium"
            recommendation['summary'] = "Both controllers passed all requirements. PID is recommended due to superior secondary engineering performance."
        else:
            recommendation['winner'] = "INCONCLUSIVE"
            recommendation['confidence'] = "low"
            recommendation['summary'] = "Both controllers passed all requirements and performed identically across secondary metrics. Either can be safely chosen."

    return recommendation
