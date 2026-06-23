for backend, use uv for dependency management. a few useful commands:

uv sync
uv add <PACKAGE-NAME>
uv run python <PYTHON-FILE>

do not add `from __future__ import annotations`; keep annotations compatible without it

keep imports at the top of Python modules; do not use inline imports

regularly commit code to git
