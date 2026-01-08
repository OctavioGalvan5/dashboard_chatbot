// State
let currentSession = null;
let currentFilter = 'all';
let currentPage = 1;
let searchText = '';
let dateFrom = '';
let dateTo = '';

// Chart instances
let messagesPerDayChart = null;
let messagesPerHourChart = null;
let topSessionsChart = null;

// DOM Elements
const sessionsList = document.getElementById('sessions-list');
const chatContainer = document.getElementById('chat-container');
const searchInput = document.getElementById('search-input');
const contentSearch = document.getElementById('content-search');
const filterButtons = document.querySelectorAll('.filter-btn');
const contentTitle = document.getElementById('content-title');
const pagination = document.getElementById('pagination');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    loadCharts();
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

    // Date filters
    dateFromInput.addEventListener('change', (e) => {
        dateFrom = e.target.value;
        currentPage = 1;
        loadConversation();
    });

    dateToInput.addEventListener('change', (e) => {
        dateTo = e.target.value;
        currentPage = 1;
        loadConversation();
    });

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

function clearDateFilters() {
    dateFromInput.value = '';
    dateToInput.value = '';
    dateFrom = '';
    dateTo = '';
    currentPage = 1;
    loadConversation();
}

// Load charts
async function loadCharts() {
    try {
        // Messages per day
        const dayResponse = await fetch('/api/chart/messages-by-day?days=30');
        const dayData = await dayResponse.json();
        renderMessagesPerDayChart(dayData);

        // Messages per hour
        const hourResponse = await fetch('/api/chart/messages-by-hour');
        const hourData = await hourResponse.json();
        renderMessagesPerHourChart(hourData);

        // Top sessions
        const topResponse = await fetch('/api/chart/top-sessions?limit=10');
        const topData = await topResponse.json();
        renderTopSessionsChart(topData);
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

function renderMessagesPerDayChart(data) {
    const ctx = document.getElementById('messagesPerDayChart').getContext('2d');

    if (messagesPerDayChart) {
        messagesPerDayChart.destroy();
    }

    messagesPerDayChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => formatDate(d.date)),
            datasets: [
                {
                    label: 'Humanos',
                    data: data.map(d => d.human),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'IA',
                    data: data.map(d => d.ai),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 10 } }
                }
            },
            scales: {
                x: { display: false },
                y: { beginAtZero: true, ticks: { font: { size: 10 } } }
            }
        }
    });
}

function renderMessagesPerHourChart(data) {
    const ctx = document.getElementById('messagesPerHourChart').getContext('2d');

    if (messagesPerHourChart) {
        messagesPerHourChart.destroy();
    }

    // Fill missing hours with 0
    const hourlyData = Array(24).fill(0);
    data.forEach(d => {
        hourlyData[d.hour] = d.total;
    });

    messagesPerHourChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Mensajes',
                data: hourlyData,
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { font: { size: 8 }, maxRotation: 0 } },
                y: { beginAtZero: true, ticks: { font: { size: 10 } } }
            }
        }
    });
}

function renderTopSessionsChart(data) {
    const ctx = document.getElementById('topSessionsChart').getContext('2d');

    if (topSessionsChart) {
        topSessionsChart.destroy();
    }

    topSessionsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => formatPhone(d.session_id).slice(-8)),
            datasets: [{
                data: data.map(d => d.total_messages),
                backgroundColor: [
                    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
                    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
                    '#eab308', '#22c55e'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 10, font: { size: 9 } }
                }
            }
        }
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
    sessionsList.innerHTML = sessions.map(session => {
        const lastMessage = session.last_message ? formatDateTime(session.last_message) : '';
        return `
            <div class="session-item" data-session="${session.session_id}" onclick="selectSession('${session.session_id}')">
                <div class="session-phone">${formatPhone(session.session_id)}</div>
                <div class="session-stats">
                    <span>📨 ${session.total_messages}</span>
                    <span>👤 ${session.human_messages}</span>
                    <span>🤖 ${session.ai_messages}</span>
                </div>
                ${lastMessage ? `<div class="session-date">Último: ${lastMessage}</div>` : ''}
            </div>
        `;
    }).join('');
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

        if (dateFrom) {
            params.append('date_from', dateFrom);
        }

        if (dateTo) {
            params.append('date_to', dateTo);
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
        const time = msg.created_at ? formatTime(msg.created_at) : '';

        return `
            <div class="message ${type}">
                <div class="message-header">
                    <div class="message-type">${type === 'human' ? '👤 Usuario' : '🤖 IA'}</div>
                    <div class="message-time">${time}</div>
                </div>
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

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
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
