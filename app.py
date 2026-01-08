from flask import Flask, render_template, request, jsonify
from database import (
    get_all_sessions, get_conversations, get_conversation_by_session, 
    get_statistics, get_messages_by_day, get_messages_by_hour, get_top_sessions
)
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def index():
    """Main dashboard page."""
    sessions = get_all_sessions()
    stats = get_statistics()
    return render_template('index.html', sessions=sessions, stats=stats)

@app.route('/api/sessions')
def api_sessions():
    """API endpoint to get all sessions."""
    sessions = get_all_sessions()
    # Convert datetime objects to strings
    for session in sessions:
        if session.get('first_message'):
            session['first_message'] = session['first_message'].isoformat()
        if session.get('last_message'):
            session['last_message'] = session['last_message'].isoformat()
    return jsonify(sessions)

@app.route('/api/conversations')
def api_conversations():
    """API endpoint to get conversations with filters."""
    session_id = request.args.get('session_id')
    message_type = request.args.get('type')
    search_text = request.args.get('search')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    result = get_conversations(
        session_id=session_id,
        message_type=message_type,
        search_text=search_text,
        date_from=date_from,
        date_to=date_to,
        page=page,
        per_page=per_page
    )
    
    # Convert datetime objects to strings
    for msg in result['messages']:
        if msg.get('created_at'):
            msg['created_at'] = msg['created_at'].isoformat()
    
    return jsonify(result)

@app.route('/api/conversation/<session_id>')
def api_conversation(session_id):
    """API endpoint to get all messages for a specific session."""
    messages = get_conversation_by_session(session_id)
    # Convert datetime objects to strings
    for msg in messages:
        if msg.get('created_at'):
            msg['created_at'] = msg['created_at'].isoformat()
    return jsonify(messages)

@app.route('/api/statistics')
def api_statistics():
    """API endpoint to get statistics."""
    stats = get_statistics()
    return jsonify(stats)

@app.route('/api/chart/messages-by-day')
def api_messages_by_day():
    """API endpoint to get messages grouped by day for charts."""
    days = request.args.get('days', 30, type=int)
    data = get_messages_by_day(days)
    # Convert dates to strings
    for item in data:
        if item.get('date'):
            item['date'] = item['date'].isoformat()
    return jsonify(data)

@app.route('/api/chart/messages-by-hour')
def api_messages_by_hour():
    """API endpoint to get messages grouped by hour for charts."""
    data = get_messages_by_hour()
    return jsonify(data)

@app.route('/api/chart/top-sessions')
def api_top_sessions():
    """API endpoint to get top sessions by message count."""
    limit = request.args.get('limit', 10, type=int)
    data = get_top_sessions(limit)
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
