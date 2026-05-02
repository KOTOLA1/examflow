/**
 * Exam Countdown App Logic
 * Extended with Dashboard, Reminders, and Weekly Planner
 */

class ExamCountdown {
    constructor() {
        this.exams = JSON.parse(localStorage.getItem('exams')) || [];
        this.reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        this.theme = localStorage.getItem('theme') || 'dark';
        
        // Cache DOM Elements
        this.examNameInput = document.getElementById('exam-name');
        this.examDateInput = document.getElementById('exam-date');
        this.addBtn = document.getElementById('add-exam');
        this.examsGrid = document.getElementById('exams-list');
        this.emptyState = document.getElementById('empty-state');
        this.themeToggle = document.getElementById('theme-toggle');
        
        // Dashboard Elements
        this.totalExamsEl = document.getElementById('total-exams');
        this.urgentCountEl = document.getElementById('urgent-count');
        this.closestExamEl = document.getElementById('closest-exam-name');
        this.remindersList = document.getElementById('reminders-list');
        
        // Modal Elements
        this.modal = document.getElementById('reminder-modal');
        this.addReminderBtn = document.getElementById('add-reminder');
        this.saveReminderBtn = document.getElementById('save-reminder');
        this.closeModalBtn = document.getElementById('close-modal');
        this.reminderTextInput = document.getElementById('reminder-text');

        // Nav
        this.navItems = document.querySelectorAll('.nav-item');
        this.tabContents = document.querySelectorAll('.tab-content');

        // PWA Install Elements
        this.installBtn = document.getElementById('install-btn');
        this.deferredPrompt = null;

        this.init();
    }

    init() {
        this.applyTheme();
        this.setupEventListeners();
        this.renderAll();
        
        setInterval(() => {
            this.updateCountdowns();
            this.renderDashboard(); // Update closest exam real-time if needed
        }, 1000);
    }

    setupEventListeners() {
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.addBtn.addEventListener('click', () => this.handleAddExam());
        
        // PWA Install Prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            if (this.installBtn) this.installBtn.style.display = 'flex';
        });

        if (this.installBtn) {
            this.installBtn.addEventListener('click', async () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    const { outcome } = await this.deferredPrompt.userChoice;
                    console.log(`User response to the install prompt: ${outcome}`);
                    this.deferredPrompt = null;
                    this.installBtn.style.display = 'none';
                }
            });
        }

        // Tab switching
        this.navItems.forEach(item => {
            item.addEventListener('click', () => this.switchTab(item.dataset.tab));
        });

        // Reminders
        this.addReminderBtn.addEventListener('click', () => this.modal.classList.add('active'));
        this.closeModalBtn.addEventListener('click', () => this.modal.classList.remove('active'));
        this.saveReminderBtn.addEventListener('click', () => this.handleAddReminder());

        // Key support
        [this.examNameInput, this.examDateInput].forEach(el => {
            el.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleAddExam(); });
        });
    }

    switchTab(tabId) {
        this.navItems.forEach(nav => nav.classList.toggle('active', nav.dataset.tab === tabId));
        this.tabContents.forEach(content => content.classList.toggle('active', content.id === `${tabId}-section`));
        this.renderAll(); // Refresh data for the specific tab
    }

    // --- Exam Logic ---
    handleAddExam() {
        const name = this.examNameInput.value.trim();
        const dateString = this.examDateInput.value;

        if (!name || !dateString) {
            this.showToast('Please fill all fields', 'info');
            return;
        }

        const newExam = {
            id: Date.now(),
            name: name,
            date: dateString,
            createdAt: Date.now()
        };

        this.exams.push(newExam);
        this.saveData();
        this.renderAll();
        this.showToast('Exam added!', 'success');
        this.examNameInput.value = '';
        this.examDateInput.value = '';
    }

    deleteExam(id) {
        const card = document.getElementById(`exam-${id}`);
        if (card) {
            card.style.animation = 'slideOutDown 0.4s ease forwards';
            setTimeout(() => {
                this.exams = this.exams.filter(exam => exam.id !== id);
                this.saveData();
                this.renderAll();
                this.showToast('Removed', 'info');
            }, 400);
        }
    }

    // --- Reminder Logic ---
    handleAddReminder() {
        const text = this.reminderTextInput.value.trim();
        if (!text) return;

        this.reminders.push({ id: Date.now(), text });
        this.saveData();
        this.renderDashboard();
        this.modal.classList.remove('active');
        this.reminderTextInput.value = '';
        this.showToast('Reminder saved', 'success');
    }

    deleteReminder(id) {
        this.reminders = this.reminders.filter(r => r.id !== id);
        this.saveData();
        this.renderDashboard();
    }

    // --- Rendering ---
    renderAll() {
        this.renderExams();
        this.renderDashboard();
        this.renderPlanner();
        lucide.createIcons();
    }

    renderExams() {
        this.examsGrid.innerHTML = '';
        if (this.exams.length === 0) {
            this.emptyState.style.display = 'block';
            return;
        }
        this.emptyState.style.display = 'none';

        const sorted = [...this.exams].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(exam => {
            const urgency = this.getUrgency(exam.date);
            const time = this.formatTime(new Date(exam.date) - new Date());
            const progress = this.calculateProgress(exam.createdAt, exam.date);

            const card = document.createElement('div');
            card.className = `exam-card glass status-${urgency}`;
            card.id = `exam-${exam.id}`;
            card.innerHTML = `
                ${urgency === 'urgent' ? '<span class="urgent-badge">Urgent</span>' : ''}
                <div class="card-header">
                    <h3 class="exam-title">${exam.name}</h3>
                    <button class="btn-delete" onclick="app.deleteExam(${exam.id})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                <div class="progress-container"><div class="progress-bar" id="progress-${exam.id}" style="width: ${progress}%"></div></div>
                <div class="countdown-display">
                    <div class="time-unit"><span class="time-val" id="days-${exam.id}">${time.d}</span><span class="time-label">Days</span></div>
                    <div class="time-unit"><span class="time-val" id="hours-${exam.id}">${time.h}</span><span class="time-label">Hrs</span></div>
                    <div class="time-unit"><span class="time-val" id="mins-${exam.id}">${time.m}</span><span class="time-label">Min</span></div>
                    <div class="time-unit"><span class="time-val" id="secs-${exam.id}">${time.s}</span><span class="time-label">Sec</span></div>
                </div>
            `;
            this.examsGrid.appendChild(card);
        });
    }

    renderDashboard() {
        const sorted = [...this.exams].sort((a, b) => new Date(a.date) - new Date(b.date));
        const urgent = this.exams.filter(e => this.getUrgency(e.date) === 'urgent').length;

        this.totalExamsEl.innerText = this.exams.length;
        this.urgentCountEl.innerText = urgent;
        this.closestExamEl.innerText = sorted.length > 0 ? sorted[0].name : 'None';

        this.remindersList.innerHTML = this.reminders.map(r => `
            <li class="reminder-item">
                <span>${r.text}</span>
                <button class="btn-delete small" onclick="app.deleteReminder(${r.id})"><i data-lucide="x"></i></button>
            </li>
        `).join('') || '<p class="text-secondary">No reminders</p>';
        lucide.createIcons();
    }

    renderPlanner() {
        const plannerGrid = document.getElementById('planner-grid');
        plannerGrid.innerHTML = '';
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(today);
            currentDay.setDate(today.getDate() + i);
            const dayName = days[currentDay.getDay()];
            const dateStr = currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const dayExams = this.exams.filter(e => {
                const d = new Date(e.date);
                return d.getDate() === currentDay.getDate() && d.getMonth() === currentDay.getMonth();
            });

            const dayEl = document.createElement('div');
            dayEl.className = 'planner-day glass';
            dayEl.innerHTML = `
                <div class="day-title">${i === 0 ? 'Today' : dayName} <small>${dateStr}</small></div>
                <div class="day-content">
                    ${dayExams.map(e => `<div class="planner-exam-item">${e.name}</div>`).join('') || '<p class="text-secondary small">No exams</p>'}
                </div>
            `;
            plannerGrid.appendChild(dayEl);
        }
    }

    // --- Helpers ---
    saveData() {
        localStorage.setItem('exams', JSON.stringify(this.exams));
        localStorage.setItem('reminders', JSON.stringify(this.reminders));
    }

    updateCountdowns() {
        this.exams.forEach(exam => {
            const diff = new Date(exam.date) - new Date();
            const time = this.formatTime(diff);
            const progress = this.calculateProgress(exam.createdAt, exam.date);

            ['days', 'hours', 'mins', 'secs'].forEach(unit => {
                const el = document.getElementById(`${unit}-${exam.id}`);
                if (el) el.innerText = time[unit.charAt(0)];
            });
            const pEl = document.getElementById(`progress-${exam.id}`);
            if (pEl) pEl.style.width = `${progress}%`;
        });
    }

    getUrgency(dateString) {
        const diff = (new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24);
        return diff < 3 ? 'urgent' : (diff < 7 ? 'soon' : 'far');
    }

    formatTime(diff) {
        if (diff <= 0) return { d: '00', h: '00', m: '00', s: '00' };
        return {
            d: String(Math.floor(diff / 86400000)).padStart(2, '0'),
            h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
            m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
            s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
        };
    }

    calculateProgress(start, end) {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const n = Date.now();
        return n >= e ? 100 : (n <= s ? 0 : ((n - s) / (e - s)) * 100);
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        localStorage.setItem('theme', this.theme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.setAttribute('data-lucide', this.theme === 'dark' ? 'sun' : 'moon');
            lucide.createIcons();
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'info'}"></i><span>${message}</span>`;
        document.body.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => {
            toast.style.animation = 'slideOutDown 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ExamCountdown();
    window.app = app; // Expose for onclick handlers
});
