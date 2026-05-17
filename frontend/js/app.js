const API = '/api';

// Theme Management
function getPreferredTheme() {
    const stored = localStorage.getItem('skillpulse-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skillpulse-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('skillpulse-theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

// State
let skills = [];
let dashboard = {};

// DOM Elements
const statsContainer = document.getElementById('stats');
const skillsGrid = document.getElementById('skills-grid');
const addSkillModal = document.getElementById('add-skill-modal');
const logSessionModal = document.getElementById('log-session-modal');
const addSkillForm = document.getElementById('add-skill-form');
const logSessionForm = document.getElementById('log-session-form');

// Charts
let hoursBySkillChart = null;
let goalProgressChart = null;

function getChartThemeVars() {
    const styles = getComputedStyle(document.documentElement);
    return {
        text: styles.getPropertyValue('--text').trim() || '#111827',
        textMuted: styles.getPropertyValue('--text-muted').trim() || '#64748b',
        primary: styles.getPropertyValue('--primary').trim() || '#4f46e5',
        success: styles.getPropertyValue('--success').trim() || '#10b981',
        border: styles.getPropertyValue('--border').trim() || '#e2e8f0',
    };
}

function renderCharts() {
    const chartsReady = typeof Chart !== 'undefined' && Array.isArray(skills) && (skills.length >= 0);
    if (!chartsReady) return;

    const vars = getChartThemeVars();

    // Hours by Skill (horizontal-ish via index axis)
    const hoursLabels = skills
        .slice()
        .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
        .slice(0, 8)
        .map(s => s.name);

    const hoursData = skills
        .slice()
        .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
        .slice(0, 8)
        .map(s => Number(s.total_hours || 0));

    const hoursCtx = document.getElementById('hoursBySkillChart');
    if (hoursCtx) {
        if (hoursBySkillChart) hoursBySkillChart.destroy();
        hoursBySkillChart = new Chart(hoursCtx, {
            type: 'bar',
            data: {
                labels: hoursLabels,
                datasets: [{
                    label: 'Hours logged',
                    data: hoursData,
                    backgroundColor: 'rgba(79, 70, 229, 0.75)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} hrs` } }
                },
                scales: {
                    x: {
                        ticks: { color: vars.textMuted },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: vars.textMuted },
                        grid: { color: vars.border }
                    }
                }
            }
        });
    }

    // Goal Progress (% completion)
    const progressItems = skills
        .filter(s => (s.target_hours || 0) > 0)
        .slice()
        .sort((a, b) => {
            const ap = Math.min(((a.total_hours || 0) / (a.target_hours || 1)) * 100, 100);
            const bp = Math.min(((b.total_hours || 0) / (b.target_hours || 1)) * 100, 100);
            return bp - ap;
        })
        .slice(0, 8);

    const goalLabels = progressItems.map(s => s.name);
    const goalData = progressItems.map(s => {
        const pct = Math.min(((s.total_hours || 0) / (s.target_hours || 1)) * 100, 100);
        return Number(pct.toFixed(1));
    });

    const goalCtx = document.getElementById('goalProgressChart');
    if (goalCtx) {
        if (goalProgressChart) goalProgressChart.destroy();
        goalProgressChart = new Chart(goalCtx, {
            type: 'doughnut',
            data: {
                labels: goalLabels,
                datasets: [{
                    data: goalData,
                    backgroundColor: goalData.map(p => p >= 100 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(129, 140, 248, 0.85)'),
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: vars.textMuted } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.parsed} %` } }
                },
                cutout: '62%'
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadSkills();

    // Charts might be ready only after skills load; we trigger renderCharts inside loadSkills/render.
});


// API Calls
async function loadDashboard() {
    try {
        const res = await fetch(`${API}/dashboard`);
        dashboard = await res.json();
        renderStats();
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

async function loadSkills() {
    try {
        const res = await fetch(`${API}/skills`);
        skills = await res.json();
        renderSkills();
    } catch (err) {
        console.error('Failed to load skills:', err);
    }
}

async function createSkill(data) {
    const res = await fetch(`${API}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create skill');
    return res.json();
}

async function deleteSkill(id) {
    const res = await fetch(`${API}/skills/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete skill');
    return res.json();
}

async function logSession(skillId, data) {
    const res = await fetch(`${API}/skills/${skillId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to log session');
    return res.json();
}

// Render Functions
function renderStats() {
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="label">Total Skills</div>
            <div class="value">${dashboard.total_skills || 0}</div>
        </div>
        <div class="stat-card">
            <div class="label">Hours Logged</div>
            <div class="value">${(dashboard.total_hours || 0).toFixed(1)}</div>
        </div>
        <div class="stat-card">
            <div class="label">Sessions</div>
            <div class="value">${dashboard.total_logs || 0}</div>
        </div>
        <div class="stat-card">
            <div class="label">Top Skill</div>
            <div class="value" style="font-size:1.2rem">${dashboard.top_skill || 'N/A'}</div>
        </div>
    `;
}

function renderSkills() {
    if (!skills || skills.length === 0) {
        skillsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1">
                <h3>No skills yet</h3>
                <p>Click "Add Skill" to start tracking your learning journey.</p>
            </div>
        `;

        // Clear charts if no data
        if (hoursBySkillChart) { hoursBySkillChart.destroy(); hoursBySkillChart = null; }
        if (goalProgressChart) { goalProgressChart.destroy(); goalProgressChart = null; }
        return;
    }

    skillsGrid.innerHTML = skills.map(skill => {

        const progress = skill.target_hours > 0
            ? Math.min((skill.total_hours / skill.target_hours) * 100, 100)
            : 0;

        return `
            <div class="skill-card">
                <div class="skill-header">
                    <span class="skill-name">${escapeHtml(skill.name)}</span>
                    ${skill.category ? `<span class="skill-category">${escapeHtml(skill.category)}</span>` : ''}
                </div>
                <div class="progress-bar">
                    <div class="fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-text">
                    <span>${skill.total_hours.toFixed(1)} hrs logged</span>
                    <span>${skill.target_hours > 0 ? skill.target_hours + ' hrs goal' : 'No goal set'}</span>
                </div>
                <div class="skill-actions">
                    <button class="btn btn-primary btn-sm" onclick="openLogModal(${skill.id}, '${escapeHtml(skill.name)}')">
                        + Log Session
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="handleDelete(${skill.id})">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Modal Handlers
function openAddModal() {
    addSkillForm.reset();
    addSkillModal.classList.add('active');
}

function closeAddModal() {
    addSkillModal.classList.remove('active');
}

let currentLogSkillId = null;

function openLogModal(skillId, skillName) {
    currentLogSkillId = skillId;
    document.getElementById('log-skill-name').textContent = skillName;
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
    logSessionForm.reset();
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
    logSessionModal.classList.add('active');
}

function closeLogModal() {
    logSessionModal.classList.remove('active');
    currentLogSkillId = null;
}

// Form Handlers
addSkillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await createSkill({
            name: document.getElementById('skill-name').value,
            category: document.getElementById('skill-category').value,
            target_hours: parseInt(document.getElementById('skill-target').value) || 0,
        });
        closeAddModal();
        showToast('Skill added!', 'success');
        loadDashboard();
        loadSkills();
    } catch (err) {
        showToast('Failed to add skill', 'error');
    }
});

logSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await logSession(currentLogSkillId, {
            hours: parseFloat(document.getElementById('log-hours').value),
            notes: document.getElementById('log-notes').value,
            log_date: document.getElementById('log-date').value,
        });
        closeLogModal();
        showToast('Session logged!', 'success');
        loadDashboard();
        loadSkills();
    } catch (err) {
        showToast('Failed to log session', 'error');
    }
});

async function handleDelete(id) {
    if (!confirm('Delete this skill and all its logs?')) return;
    try {
        await deleteSkill(id);
        showToast('Skill deleted', 'success');
        loadDashboard();
        loadSkills();
    } catch (err) {
        showToast('Failed to delete skill', 'error');
    }
}

// Utilities
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Close modals on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target === el) {
            el.classList.remove('active');
        }
    });
});
