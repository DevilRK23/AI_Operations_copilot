import os
import sqlite3

DB_DIR = "database"
DB = os.path.join(DB_DIR, "incidents.db")

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB)
    
    # Create users table
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        api_key TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Create incidents table
    conn.execute("""
    CREATE TABLE IF NOT EXISTS incidents(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        incident TEXT,
        root_cause TEXT,
        severity TEXT,
        confidence INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)
    
    # Check if user_id column exists in incidents table
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(incidents)")
    columns = [col[1] for col in cursor.fetchall()]
    if "user_id" not in columns:
        try:
            conn.execute("ALTER TABLE incidents ADD COLUMN user_id INTEGER REFERENCES users(id)")
        except Exception as e:
            print(f"Error migrating incidents table: {e}")
            
    conn.commit()
    conn.close()

def create_user(username, email, hashed_password):
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, email, hashed_password) VALUES (?, ?, ?)",
            (username, email, hashed_password)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def get_user_by_username(username):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_api_key(api_key):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE api_key = ?", (api_key,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_api_key(user_id, api_key):
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET api_key = ? WHERE id = ?", (api_key, user_id))
    conn.commit()
    conn.close()