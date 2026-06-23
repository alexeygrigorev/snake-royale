from app.store import connect_args_for_url, normalize_database_url


def test_plain_postgresql_url_uses_psycopg_driver():
    url = normalize_database_url("postgresql://snakearena:secret@localhost/snakearena")

    assert url.drivername == "postgresql+psycopg"


def test_postgres_alias_url_uses_psycopg_driver():
    url = normalize_database_url("postgres://snakearena:secret@localhost/snakearena")

    assert url.drivername == "postgresql+psycopg"


def test_sqlite_url_keeps_thread_check_disabled():
    url = normalize_database_url("sqlite:///snake_royale.db")

    assert url.drivername == "sqlite"
    assert connect_args_for_url(url) == {"check_same_thread": False}


def test_postgresql_url_does_not_use_sqlite_connect_args():
    url = normalize_database_url("postgresql://snakearena:secret@localhost/snakearena")

    assert connect_args_for_url(url) == {}
