from flask import Flask, render_template, request, jsonify
from database import get_all_sessions, get_conversations, get_conversation_by_session, get_statistics

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
    return jsonify(sessions)

@app.route('/api/conversations')
def api_conversations():
    """API endpoint to get conversations with filters."""
    session_id = request.args.get('session_id')
    message_type = request.args.get('type')
    search_text = request.args.get('search')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    result = get_conversations(
        session_id=session_id,
        message_type=message_type,
        search_text=search_text,
        page=page,
        per_page=per_page
    )
    return jsonify(result)

@app.route('/api/conversation/<session_id>')
def api_conversation(session_id):
    """API endpoint to get all messages for a specific session."""
    messages = get_conversation_by_session(session_id)
    return jsonify(messages)

@app.route('/api/statistics')
def api_statistics():
    """API endpoint to get statistics."""
    stats = get_statistics()
    return jsonify(stats)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
