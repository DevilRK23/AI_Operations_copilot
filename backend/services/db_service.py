import sqlite3

DB = "database/incidents.db"

def init_db():

    conn = sqlite3.connect(DB)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS incidents(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident TEXT,
        root_cause TEXT,
        severity TEXT,
        confidence INTEGER
    )
    """)

    conn.commit()
    conn.close()