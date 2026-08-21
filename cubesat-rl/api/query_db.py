#!/usr/bin/env python3
"""
CubeSat RL — DB Query Bridge
Called by the Node.js backend to query/mutate the SQLite DB.
Outputs a single JSON object to stdout.

Usage:
  python query_db.py --action <action> [options]

Actions:
  # Auth
  create_user           --username --email --password_hash --role
  get_user_by_email     --email
  get_user_by_id        --id
  get_user_by_username  --username

  # Missions
  create_mission        --user_id --name --description --target_alt_km
                        --min_alt_km --fuel_budget_kg --power_budget_wh
                        --steps --is_public
  list_missions         --user_id
  get_mission           --id
  update_mission        --id --user_id --fields (JSON string)
  delete_mission        --id --user_id

  # Simulations
  list_simulations      [--limit N] [--user_id N]
  get_simulation        --id
  delete_simulation     --id

  # Comparisons
  list_comparisons      [--limit N] [--user_id N]
"""
import sys
import os
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import (
    # Users
    create_user, get_user_by_email, get_user_by_id, get_user_by_username,
    # Missions
    create_mission_profile, get_mission_profiles, get_mission_profile,
    update_mission_profile, delete_mission_profile,
    # Simulations
    get_simulation_history, get_simulation_detail, delete_simulation,
    # Comparisons
    get_comparison_history,
)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--action',        required=True)
    p.add_argument('--id',            type=int,   default=None)
    p.add_argument('--user_id',       type=int,   default=None)
    p.add_argument('--limit',         type=int,   default=50)
    p.add_argument('--email',         default=None)
    p.add_argument('--username',      default=None)
    p.add_argument('--password_hash', default=None)
    p.add_argument('--role',          default='analyst')
    p.add_argument('--name',          default=None)
    p.add_argument('--description',   default='')
    p.add_argument('--target_alt_km', type=float, default=450.0)
    p.add_argument('--min_alt_km',    type=float, default=400.0)
    p.add_argument('--fuel_budget_kg',type=float, default=1.0)
    p.add_argument('--power_budget_wh',type=float,default=10.0)
    p.add_argument('--steps',         type=int,   default=200)
    p.add_argument('--is_public',     default='0')
    p.add_argument('--fields',        default='{}')  # JSON string for update
    args = p.parse_args()

    try:
        action = args.action

        # ── Users ────────────────────────────────────────────────────────────
        if action == 'create_user':
            uid = create_user(
                username=args.username, email=args.email,
                password_hash=args.password_hash, role=args.role,
            )
            print(json.dumps({'ok': True, 'data': {'id': uid}}))

        elif action == 'get_user_by_email':
            user = get_user_by_email(args.email)
            if user is None:
                print(json.dumps({'ok': False, 'data': None}))
            else:
                print(json.dumps({'ok': True, 'data': user}))

        elif action == 'get_user_by_id':
            user = get_user_by_id(args.id)
            if user is None:
                print(json.dumps({'ok': False, 'error': 'User not found'}))
            else:
                print(json.dumps({'ok': True, 'data': user}))

        elif action == 'get_user_by_username':
            user = get_user_by_username(args.username)
            print(json.dumps({'ok': user is not None, 'data': user}))

        # ── Missions ─────────────────────────────────────────────────────────
        elif action == 'create_mission':
            mid = create_mission_profile(
                user_id=args.user_id, name=args.name,
                description=args.description,
                target_alt_km=args.target_alt_km,
                min_alt_km=args.min_alt_km,
                fuel_budget_kg=args.fuel_budget_kg,
                power_budget_wh=args.power_budget_wh,
                steps=args.steps,
                is_public=args.is_public == '1',
            )
            print(json.dumps({'ok': True, 'data': {'id': mid}}))

        elif action == 'list_missions':
            missions = get_mission_profiles(user_id=args.user_id)
            print(json.dumps({'ok': True, 'data': missions}))

        elif action == 'get_mission':
            mission = get_mission_profile(args.id)
            if mission is None:
                print(json.dumps({'ok': False, 'error': f'Mission {args.id} not found'}))
            else:
                print(json.dumps({'ok': True, 'data': mission}))

        elif action == 'update_mission':
            fields = json.loads(args.fields)
            updated = update_mission_profile(args.id, args.user_id, fields)
            print(json.dumps({'ok': updated}))

        elif action == 'delete_mission':
            deleted = delete_mission_profile(args.id, args.user_id)
            print(json.dumps({'ok': deleted, 'deleted': deleted}))

        # ── Simulations ───────────────────────────────────────────────────────
        elif action == 'list_simulations':
            data = get_simulation_history(limit=args.limit, user_id=args.user_id)
            print(json.dumps({'ok': True, 'data': data}))

        elif action == 'get_simulation':
            if args.id is None:
                print(json.dumps({'ok': False, 'error': '--id required'}))
                sys.exit(1)
            detail = get_simulation_detail(args.id)
            if detail is None:
                print(json.dumps({'ok': False, 'error': f'Simulation {args.id} not found'}))
            else:
                print(json.dumps({'ok': True, 'data': detail}))

        elif action == 'delete_simulation':
            if args.id is None:
                print(json.dumps({'ok': False, 'error': '--id required'}))
                sys.exit(1)
            deleted = delete_simulation(args.id)
            print(json.dumps({'ok': deleted, 'deleted': deleted, 'id': args.id}))

        # ── Comparisons ───────────────────────────────────────────────────────
        elif action == 'list_comparisons':
            data = get_comparison_history(limit=args.limit, user_id=args.user_id)
            print(json.dumps({'ok': True, 'data': data}))

        else:
            print(json.dumps({'ok': False, 'error': f'Unknown action: {action}'}))
            sys.exit(1)

    except Exception as exc:
        print(json.dumps({'ok': False, 'error': str(exc)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
