import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Argentina timezone
ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'

def get_connection():
    """Create a new database connection."""
    return psycopg.connect(
        host=os.getenv('POSTGRES_HOST'),
        port=os.getenv('POSTGRES_PORT'),
        user=os.getenv('POSTGRES_USER'),
        password=os.getenv('POSTGRES_PASSWORD'),
        dbname=os.getenv('POSTGRES_DATABASE'),
        row_factory=dict_row
    )

def get_all_sessions():
    """Get all unique session IDs (phone numbers) with message counts."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT 
                    session_id,
                    COUNT(*) as total_messages,
                    COUNT(*) FILTER (WHERE message->>'type' = 'human') as human_messages,
                    COUNT(*) FILTER (WHERE message->>'type' = 'ai') as ai_messages,
                    MIN(created_at AT TIME ZONE '{ARGENTINA_TZ}') as first_message,
                    MAX(created_at AT TIME ZONE '{ARGENTINA_TZ}') as last_message
                FROM n8n_chat_histories
                GROUP BY session_id
                ORDER BY MAX(created_at) DESC
            """)
            return cur.fetchall()

def get_conversations(session_id=None, message_type=None, search_text=None, 
                     date_from=None, date_to=None, page=1, per_page=50):
    """Get conversations with optional filters including date range."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            conditions = []
            params = []
            
            if session_id:
                conditions.append("session_id = %s")
                params.append(session_id)
            
            if message_type and message_type in ['human', 'ai']:
                conditions.append("message->>'type' = %s")
                params.append(message_type)
            
            if search_text:
                conditions.append("message->>'content' ILIKE %s")
                params.append(f'%{search_text}%')
            
            if date_from:
                conditions.append(f"created_at AT TIME ZONE '{ARGENTINA_TZ}' >= %s")
                params.append(date_from)
            
            if date_to:
                conditions.append(f"created_at AT TIME ZONE '{ARGENTINA_TZ}' <= %s")
                params.append(date_to + ' 23:59:59')
            
            where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
            
            # Get total count
            count_query = f"SELECT COUNT(*) as count FROM n8n_chat_histories {where_clause}"
            cur.execute(count_query, params)
            total = cur.fetchone()['count']
            
            # Get paginated results with Argentina time
            offset = (page - 1) * per_page
            query = f"""
                SELECT 
                    id, 
                    session_id, 
                    message,
                    created_at AT TIME ZONE '{ARGENTINA_TZ}' as created_at
                FROM n8n_chat_histories
                {where_clause}
                ORDER BY id ASC
                LIMIT %s OFFSET %s
            """
            params.extend([per_page, offset])
            cur.execute(query, params)
            
            return {
                'messages': cur.fetchall(),
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page if total > 0 else 1
            }

def get_conversation_by_session(session_id):
    """Get all messages for a specific session in order."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT 
                    id, 
                    session_id, 
                    message,
                    created_at AT TIME ZONE '{ARGENTINA_TZ}' as created_at
                FROM n8n_chat_histories
                WHERE session_id = %s
                ORDER BY id ASC
            """, (session_id,))
            return cur.fetchall()

def get_statistics():
    """Get general statistics about the conversations."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COUNT(*) as total_messages,
                    COUNT(DISTINCT session_id) as total_sessions,
                    COUNT(*) FILTER (WHERE message->>'type' = 'human') as human_messages,
                    COUNT(*) FILTER (WHERE message->>'type' = 'ai') as ai_messages
                FROM n8n_chat_histories
            """)
            return cur.fetchone()

def get_messages_by_day(days=30):
    """Get message counts grouped by day for charts."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT 
                    DATE(created_at AT TIME ZONE '{ARGENTINA_TZ}') as date,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE message->>'type' = 'human') as human,
                    COUNT(*) FILTER (WHERE message->>'type' = 'ai') as ai
                FROM n8n_chat_histories
                WHERE created_at >= NOW() - INTERVAL '%s days'
                GROUP BY DATE(created_at AT TIME ZONE '{ARGENTINA_TZ}')
                ORDER BY date ASC
            """, (days,))
            return cur.fetchall()

def get_messages_by_hour():
    """Get message counts grouped by hour for charts."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT 
                    EXTRACT(HOUR FROM created_at AT TIME ZONE '{ARGENTINA_TZ}')::int as hour,
                    COUNT(*) as total
                FROM n8n_chat_histories
                GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE '{ARGENTINA_TZ}')
                ORDER BY hour ASC
            """)
            return cur.fetchall()

def get_top_sessions(limit=10):
    """Get top sessions by message count."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    session_id,
                    COUNT(*) as total_messages
                FROM n8n_chat_histories
                GROUP BY session_id
                ORDER BY total_messages DESC
                LIMIT %s
            """, (limit,))
            return cur.fetchall()
