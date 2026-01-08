import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

load_dotenv()

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
            cur.execute("""
                SELECT 
                    session_id,
                    COUNT(*) as total_messages,
                    COUNT(*) FILTER (WHERE message->>'type' = 'human') as human_messages,
                    COUNT(*) FILTER (WHERE message->>'type' = 'ai') as ai_messages
                FROM n8n_chat_histories
                GROUP BY session_id
                ORDER BY session_id
            """)
            return cur.fetchall()

def get_conversations(session_id=None, message_type=None, search_text=None, page=1, per_page=50):
    """Get conversations with optional filters."""
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
            
            where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
            
            # Get total count
            count_query = f"SELECT COUNT(*) as count FROM n8n_chat_histories {where_clause}"
            cur.execute(count_query, params)
            total = cur.fetchone()['count']
            
            # Get paginated results
            offset = (page - 1) * per_page
            query = f"""
                SELECT id, session_id, message
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
                'total_pages': (total + per_page - 1) // per_page
            }

def get_conversation_by_session(session_id):
    """Get all messages for a specific session in order."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, session_id, message
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

