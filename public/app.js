// Meeting Assistant Dashboard JavaScript

class MeetingDashboard {
    constructor() {
        this.meetingState = {
            id: null,
            title: 'Loading...',
            startTime: null,
            agenda: [],
            suggestions: [],
            decisions: [],
            actionItems: [],
            isActive: false
        };
        
        this.currentFilter = 'all';
        this.meetingTimer = null;
        this.wsConnection = null;
        
        this.initializeEventListeners();
        this.initializeWebSocket();
        this.startMeetingTimer();
    }

    initializeEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.type);
            });
        });

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Modal buttons
        document.getElementById('addAgendaItem').addEventListener('click', () => {
            this.showModal('addAgendaModal');
        });

        document.getElementById('closeAgendaModal').addEventListener('click', () => {
            this.hideModal('addAgendaModal');
        });

        document.getElementById('cancelAgenda').addEventListener('click', () => {
            this.hideModal('addAgendaModal');
        });

        document.getElementById('exportSummary').addEventListener('click', () => {
            this.showModal('exportModal');
        });

        document.getElementById('closeExportModal').addEventListener('click', () => {
            this.hideModal('exportModal');
        });

        // Export buttons
        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportSummary('pdf');
        });

        document.getElementById('exportWord').addEventListener('click', () => {
            this.exportSummary('word');
        });

        document.getElementById('exportText').addEventListener('click', () => {
            this.exportSummary('text');
        });

        // Agenda form
        document.getElementById('agendaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAgendaItem();
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    initializeWebSocket() {
        // Connect to WebSocket for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.wsConnection = new WebSocket(wsUrl);
            
            this.wsConnection.onopen = () => {
                console.log('WebSocket connected');
                this.updateMeetingStatus('Connected');
            };
            
            this.wsConnection.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };
            
            this.wsConnection.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateMeetingStatus('Disconnected');
                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.initializeWebSocket(), 5000);
            };
            
            this.wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateMeetingStatus('Connection Error');
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.updateMeetingStatus('Connection Failed');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'meeting_state':
                this.updateMeetingState(data.state);
                break;
            case 'suggestion':
                this.addSuggestion(data.suggestion);
                break;
            case 'decision':
                this.addDecision(data.decision);
                break;
            case 'action_item':
                this.addActionItem(data.actionItem);
                break;
            case 'transcript':
                this.updateTranscript(data.transcript);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    updateMeetingState(state) {
        this.meetingState = { ...this.meetingState, ...state };
        this.render();
    }

    addSuggestion(suggestion) {
        this.meetingState.suggestions.unshift(suggestion);
        this.renderSuggestions();
        this.updateStats();
        this.showNotification(`New suggestion: ${suggestion.title}`);
    }

    addDecision(decision) {
        this.meetingState.decisions.unshift(decision);
        this.renderDecisions();
        this.updateStats();
    }

    addActionItem(actionItem) {
        this.meetingState.actionItems.unshift(actionItem);
        this.renderActionItems();
        this.updateStats();
    }

    updateTranscript(transcript) {
        // Update transcript display if needed
        console.log('Transcript updated:', transcript);
    }

    setFilter(type) {
        this.currentFilter = type;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        this.renderSuggestions();
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tab}Tab`).classList.add('active');
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    addAgendaItem() {
        const title = document.getElementById('agendaTitle').value;
        const description = document.getElementById('agendaDescription').value;
        const duration = parseInt(document.getElementById('agendaDuration').value);
        
        const agendaItem = {
            id: `agenda_${Date.now()}`,
            title,
            description,
            duration,
            isCompleted: false
        };
        
        this.meetingState.agenda.push(agendaItem);
        this.renderAgenda();
        this.hideModal('addAgendaModal');
        
        // Clear form
        document.getElementById('agendaForm').reset();
        
        // Send to server
        this.sendToServer('add_agenda_item', agendaItem);
    }

    exportSummary(format) {
        const summary = this.generateSummary();
        
        switch (format) {
            case 'pdf':
                this.exportAsPDF(summary);
                break;
            case 'word':
                this.exportAsWord(summary);
                break;
            case 'text':
                this.exportAsText(summary);
                break;
        }
        
        this.hideModal('exportModal');
    }

    generateSummary() {
        const duration = this.meetingState.startTime ? 
            Math.round((Date.now() - this.meetingState.startTime.getTime()) / (1000 * 60)) : 0;
        
        return {
            title: this.meetingState.title,
            date: this.meetingState.startTime || new Date(),
            duration,
            agenda: this.meetingState.agenda,
            decisions: this.meetingState.decisions,
            actionItems: this.meetingState.actionItems,
            suggestions: this.meetingState.suggestions
        };
    }

    exportAsPDF(summary) {
        // Simple PDF export using browser print
        const printWindow = window.open('', '_blank');
        const content = this.formatSummaryForPrint(summary);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Meeting Summary - ${summary.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1, h2 { color: #333; }
                        .section { margin-bottom: 20px; }
                        .item { margin-bottom: 10px; padding: 10px; border-left: 3px solid #667eea; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    exportAsWord(summary) {
        const content = this.formatSummaryForPrint(summary);
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${summary.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    exportAsText(summary) {
        const content = this.formatSummaryAsText(summary);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${summary.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    formatSummaryForPrint(summary) {
        return `
            <h1>Meeting Summary: ${summary.title}</h1>
            <div class="section">
                <h2>Meeting Details</h2>
                <p><strong>Date:</strong> ${summary.date.toLocaleDateString()}</p>
                <p><strong>Duration:</strong> ${summary.duration} minutes</p>
            </div>
            
            <div class="section">
                <h2>Agenda</h2>
                ${summary.agenda.map(item => `
                    <div class="item">
                        <strong>${item.title}</strong>
                        ${item.description ? `<p>${item.description}</p>` : ''}
                        <p><em>Duration: ${item.duration} minutes</em></p>
                    </div>
                `).join('')}
            </div>
            
            <div class="section">
                <h2>Decisions Made</h2>
                ${summary.decisions.map(decision => `
                    <div class="item">
                        <strong>${decision.title}</strong>
                        <p>${decision.description}</p>
                    </div>
                `).join('')}
            </div>
            
            <div class="section">
                <h2>Action Items</h2>
                ${summary.actionItems.map(action => `
                    <div class="item">
                        <strong>${action.task}</strong>
                        <p>Assignee(s): ${action.assignees.join(', ')}</p>
                        ${action.deadline ? `<p>Deadline: ${action.deadline.toLocaleDateString()}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatSummaryAsText(summary) {
        return `
MEETING SUMMARY: ${summary.title}
Date: ${summary.date.toLocaleDateString()}
Duration: ${summary.duration} minutes

AGENDA:
${summary.agenda.map((item, index) => `${index + 1}. ${item.title} (${item.duration} min)`).join('\n')}

DECISIONS MADE:
${summary.decisions.map(decision => `• ${decision.title}: ${decision.description}`).join('\n')}

ACTION ITEMS:
${summary.actionItems.map(action => `• ${action.task} - ${action.assignees.join(', ')}${action.deadline ? ` (Due: ${action.deadline.toLocaleDateString()})` : ''}`).join('\n')}
        `;
    }

    startMeetingTimer() {
        this.meetingTimer = setInterval(() => {
            if (this.meetingState.startTime) {
                const elapsed = Date.now() - this.meetingState.startTime.getTime();
                const hours = Math.floor(elapsed / (1000 * 60 * 60));
                const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
                
                const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                document.getElementById('meetingTimer').textContent = timeString;
            }
        }, 1000);
    }

    updateMeetingStatus(status) {
        document.getElementById('meetingStatus').textContent = status;
    }

    updateStats() {
        document.getElementById('totalSuggestions').textContent = this.meetingState.suggestions.length;
        document.getElementById('totalDecisions').textContent = this.meetingState.decisions.length;
        document.getElementById('totalActions').textContent = this.meetingState.actionItems.length;
    }

    showNotification(message) {
        // Simple notification - could be enhanced with a proper notification system
        console.log('Notification:', message);
        
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    sendToServer(type, data) {
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.send(JSON.stringify({ type, data }));
        }
    }

    render() {
        this.renderAgenda();
        this.renderSuggestions();
        this.renderDecisions();
        this.renderActionItems();
        this.updateStats();
        
        document.getElementById('meetingTitle').textContent = this.meetingState.title;
    }

    renderAgenda() {
        const container = document.getElementById('agendaList');
        container.innerHTML = this.meetingState.agenda.map((item, index) => `
            <div class="agenda-item ${item.isCompleted ? 'completed' : ''} ${index === this.meetingState.currentAgendaItem ? 'active' : ''}" 
                 data-index="${index}">
                <h3>${item.title}</h3>
                ${item.description ? `<p>${item.description}</p>` : ''}
                <div class="duration">${item.duration} min</div>
            </div>
        `).join('');
        
        // Add click handlers for agenda items
        container.querySelectorAll('.agenda-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.setCurrentAgendaItem(index);
            });
        });
    }

    renderSuggestions() {
        const container = document.getElementById('suggestionsList');
        const filteredSuggestions = this.currentFilter === 'all' 
            ? this.meetingState.suggestions 
            : this.meetingState.suggestions.filter(s => s.type === this.currentFilter);
        
        container.innerHTML = filteredSuggestions.map(suggestion => `
            <div class="suggestion ${suggestion.priority}-priority ${suggestion.type}">
                <div class="suggestion-header">
                    <div class="suggestion-title">${suggestion.title}</div>
                    <div class="suggestion-type">${suggestion.type.replace('_', ' ')}</div>
                </div>
                <div class="suggestion-message">${suggestion.message}</div>
                <div class="suggestion-actions">
                    <button class="btn btn-sm btn-primary" onclick="dashboard.acknowledgeSuggestion('${suggestion.id}')">
                        Acknowledge
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderDecisions() {
        const container = document.getElementById('decisionsList');
        container.innerHTML = this.meetingState.decisions.map(decision => `
            <div class="decision">
                <h3>${decision.title}</h3>
                <p>${decision.description}</p>
                <div class="decision-meta">
                    <span>${decision.timestamp.toLocaleTimeString()}</span>
                    <span>${decision.participants.join(', ')}</span>
                </div>
            </div>
        `).join('');
    }

    renderActionItems() {
        const container = document.getElementById('actionsList');
        container.innerHTML = this.meetingState.actionItems.map(action => `
            <div class="action-item">
                <h3>${action.task}</h3>
                <p>${action.description || ''}</p>
                <div class="action-meta">
                    <span class="assignees">${action.assignees.join(', ')}</span>
                    ${action.deadline ? `<span class="deadline">Due: ${action.deadline.toLocaleDateString()}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    setCurrentAgendaItem(index) {
        this.meetingState.currentAgendaItem = index;
        this.renderAgenda();
        this.sendToServer('set_agenda_item', { index });
    }

    acknowledgeSuggestion(suggestionId) {
        const suggestion = this.meetingState.suggestions.find(s => s.id === suggestionId);
        if (suggestion) {
            suggestion.isAcknowledged = true;
            this.renderSuggestions();
            this.sendToServer('acknowledge_suggestion', { suggestionId });
        }
    }
}

// Initialize the dashboard when the page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new MeetingDashboard();
});
