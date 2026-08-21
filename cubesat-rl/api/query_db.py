#!/usr/bin/env python3
"""
CubeSat RL — DB Query Bridge
Called by the Node.js backend to fetch history data.
Outputs a single JSON object to stdout.

Usage:
  python query_db.py --action list_simulations [--limit N]
  python query_db.py --action get_simulation   --id <sim_id>
  python query_db.py --action list_comparisons [--limit N]
  python query_db.py --action delete_simulation --id <sim_id>
"""
import sys
import os
import json
import argparse

# Allow import from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import (
    get_simulation_history,
    get_simulation_detail,
    get_comparison_history,
    delete_simulation,
)


def main():
    parser = argparse.ArgumentParser(description="CubeSat RL DB query bridge")
    parser.add_argument("--action", required=True,
                        choices=["list_simulations", "get_simulation",
                                 "list_comparisons", "delete_simulation"])
    parser.add_argument("--id",    type=int,  default=None, help="Simulation ID")
    parser.add_argument("--limit", type=int,  default=50,   help="Max rows returned")
    args = parser.parse_args()

    try:
        if args.action == "list_simulations":
            data = get_simulation_history(limit=args.limit)
            print(json.dumps({"ok": True, "data": data}))

        elif args.action == "get_simulation":
            if args.id is None:
                print(json.dumps({"ok": False, "error": "--id is required"}))
                sys.exit(1)
            detail = get_simulation_detail(args.id)
            if detail is None:
                print(json.dumps({"ok": False, "error": f"Simulation {args.id} not found"}))
            else:
                print(json.dumps({"ok": True, "data": detail}))

        elif args.action == "list_comparisons":
            data = get_comparison_history(limit=args.limit)
            print(json.dumps({"ok": True, "data": data}))

        elif args.action == "delete_simulation":
            if args.id is None:
                print(json.dumps({"ok": False, "error": "--id is required"}))
                sys.exit(1)
            deleted = delete_simulation(args.id)
            print(json.dumps({"ok": deleted, "deleted": deleted,
                              "id": args.id}))

    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
