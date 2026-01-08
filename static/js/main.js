// State
let currentSession = null;
let currentFilter = 'all';
let currentPage = 1;
let searchText = '';

// DOM Elements
const sessionsList = document.getElementById('sessions-list');
const chatContainer = document.getElementById('chat-container');
const searchInput = document.getElementById('search-input');
const contentSearch = document.getElementById('content-search');
const filterButtons = document.querySelectorAll('.filter-btn');
const contentTitle = document.getElementById('content-title');
const pagination = document.getElementById('pagination');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    setupEventListeners();
});

function setupEventListeners() {
    // Session search
    searchInput.addEventListener('input', debounce((e) => {
        filterSessions(e.target.value);
    }, 300));

    // Content search
    contentSearch.addEventListener('input', debounce((e) => {
        searchText = e.target.value;
        currentPage = 1;
        loadConversation();
    }, 300));

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            currentPage = 1;
            loadConversation();
        });
    });
}

// Load sessions from API
async function loadSessions() {
    try {
        const response = await fetch('/api/sessions');
        const sessions = await response.json();
        renderSessions(sessions);
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

// Render sessions list
function renderSessions(sessions) {
    sessionsList.innerHTML = sessions.map(session => `
        <div class="session-item" data-session="${session.session_id}" onclick="selectSession('${session.session_id}')">
            <div class="session-phone">${formatPhone(session.session_id)}</div>
            <div class="session-stats">
                <span>📨 ${session.total_messages}</span>
                <span>👤 ${session.human_messages}</span>
                <span>🤖 ${session.ai_messages}</span>
            </div>
        </div>
    `).join('');
}

// Filter sessions by search
function filterSessions(query) {
    const items = sessionsList.querySelectorAll('.session-item');
    items.forEach(item => {
        const phone = item.dataset.session;
        item.style.display = phone.includes(query) ? '' : 'none';
    });
}

// Select a session
function selectSession(sessionId) {
    currentSession = sessionId;
    currentPage = 1;

    // Update active state
    document.querySelectorAll('.session-item').forEach(item => {
        item.classList.toggle('active', item.dataset.session === sessionId);
    });

    contentTitle.textContent = `Conversación: ${formatPhone(sessionId)}`;
    loadConversation();
}

// Load conversation messages
async function loadConversation() {
    if (!currentSession) {
        showEmptyState('Selecciona una conversación del panel izquierdo');
        return;
    }

    chatContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams({
            session_id: currentSession,
            page: currentPage,
            per_page: 50
        });

        if (currentFilter !== 'all') {
            params.append('type', currentFilter);
        }

        if (searchText) {
            params.append('search', searchText);
        }

        const response = await fetch(`/api/conversations?${params}`);
        const data = await response.json();

        renderMessages(data.messages);
        renderPagination(data);
    } catch (error) {
        console.error('Error loading conversation:', error);
        chatContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">Error al cargar la conversación</div></div>';
    }
}

// Render messages
function renderMessages(messages) {
    if (messages.length === 0) {
        showEmptyState('No se encontraron mensajes con los filtros aplicados');
        return;
    }

    chatContainer.innerHTML = messages.map(msg => {
        const type = msg.message.type || 'unknown';
        const content = msg.message.content || '';

        return `
            <div class="message ${type}">
                <div class="message-type">${type === 'human' ? '👤 Usuario' : '🤖 IA'}</div>
                <div class="message-content">${escapeHtml(content)}</div>
                <div class="message-id">ID: ${msg.id}</div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Render pagination
function renderPagination(data) {
    if (data.total_pages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    pagination.innerHTML = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>← Anterior</button>
        <span class="pagination-info">Página ${data.page} de ${data.total_pages} (${data.total} mensajes)</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= data.total_pages ? 'disabled' : ''}>Siguiente →</button>
    `;
}

// Change page
function changePage(page) {
    currentPage = page;
    loadConversation();
}

// Show empty state
function showEmptyState(message) {
    chatContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-text">${message}</div>
        </div>
    `;
    pagination.innerHTML = '';
}

// Utility functions
function formatPhone(phone) {
    return phone.startsWith('+') ? phone : `+${phone}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
