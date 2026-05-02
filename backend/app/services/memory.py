import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

class MemoryService:
    """
    Claude-Mem Inspired Persistent Context Service.
    Tracks user search intent, viewed products, and session-based intelligence.
    """
    def __init__(self, db_path: str = "damkoi_local.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_memory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL, -- 'search', 'view', 'alert_set'
                    payload TEXT NOT NULL,     -- JSON data
                    created_at TIMESTAMP DEFAULT CURRENT_VALUE,
                    session_id TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_memory_session ON user_memory(session_id)")

    def record_event(self, event_type: str, payload: Dict[str, Any], session_id: Optional[str] = None):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO user_memory (event_type, payload, session_id, created_at) VALUES (?, ?, ?, ?)",
                (event_type, json.dumps(payload), session_id, datetime.utcnow().isoformat())
            )

    def get_recent_intent(self, limit: int = 5) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM user_memory ORDER BY created_at DESC LIMIT ?",
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_market_trends(self) -> Dict[str, Any]:
        """Synthesize memory into actionable market insights."""
        with sqlite3.connect(self.db_path) as conn:
            # Simple aggregation for now
            cursor = conn.execute("SELECT count(*) as count, event_type FROM user_memory GROUP BY event_type")
            return {row[1]: row[0] for row in cursor.fetchall()}

# Singleton instance
memory_service = MemoryService()
