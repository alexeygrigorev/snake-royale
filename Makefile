.PHONY: install dev backend frontend backend-tests frontend-tests test

install:
	cd backend && uv sync
	cd frontend && npm install

dev:
	@bash -c '\
		set -e; \
		cleanup() { \
			trap - INT TERM EXIT; \
			kill "$$backend_pid" "$$frontend_pid" 2>/dev/null || true; \
			wait "$$backend_pid" "$$frontend_pid" 2>/dev/null || true; \
		}; \
		trap cleanup INT TERM EXIT; \
		(cd backend && uv run python main.py) & \
		backend_pid=$$!; \
		(cd frontend && npm run dev) & \
		frontend_pid=$$!; \
		wait -n "$$backend_pid" "$$frontend_pid"'

backend:
	cd backend && uv run python main.py

frontend:
	cd frontend && npm run dev

backend-tests:
	cd backend && uv run pytest

frontend-tests:
	cd frontend && npm test

test: backend-tests frontend-tests
