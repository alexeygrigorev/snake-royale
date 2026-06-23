.PHONY: install dev backend frontend backend-tests backend-integration-tests frontend-tests test

install:
	cd backend && uv sync
	cd frontend && npm install

dev:
	@./scripts/dev.sh

backend:
	cd backend && uv run python main.py

frontend:
	cd frontend && npm run dev

backend-tests:
	cd backend && uv run pytest

backend-integration-tests:
	cd backend && uv run pytest tests_integration

frontend-tests:
	cd frontend && npm test

test: backend-tests frontend-tests
