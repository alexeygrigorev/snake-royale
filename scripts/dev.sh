#!/usr/bin/env bash

set -euo pipefail

backend_pid=""
frontend_pid=""

cleanup() {
	trap - INT TERM EXIT

	if [[ -n "$backend_pid" ]]; then
		kill "$backend_pid" 2>/dev/null || true
	fi

	if [[ -n "$frontend_pid" ]]; then
		kill "$frontend_pid" 2>/dev/null || true
	fi

	wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

(
	cd backend
	uv run python main.py
) &
backend_pid=$!

(
	cd frontend
	npm run dev
) &
frontend_pid=$!

wait -n "$backend_pid" "$frontend_pid"
