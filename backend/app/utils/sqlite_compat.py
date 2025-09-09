def _ensure_sqlite_columns(engine):
    if engine.url.get_backend_name() != "sqlite":
        return

    def has_col(conn, table, col):
        rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        return any(r[1] == col for r in rows)

    with engine.begin() as conn:
        if not has_col(conn, "files", "extra_metadata"):
            conn.exec_driver_sql("ALTER TABLE files ADD COLUMN extra_metadata TEXT")
        if not has_col(conn, "messages", "sources"):
            conn.exec_driver_sql("ALTER TABLE messages ADD COLUMN sources TEXT")
        if not has_col(conn, "messages", "meta"):
            conn.exec_driver_sql("ALTER TABLE messages ADD COLUMN meta TEXT")
