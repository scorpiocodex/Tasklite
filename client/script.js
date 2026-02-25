// =============================================
// TaskLite — script.js v2.1
// =============================================

const API_BASE = '';

const state = {
  tasks: [],
  activeFilter: 'all',
  searchQuery: '',
  draggedTask: null,
};

// ─── DOM ─────────────────────────────────────
const els = {
  taskInput: document.getElementById('taskInput'),
  searchInput: document.getElementById('searchInput'),
  addBtn: document.getElementById('addBtn'),
  clearBtn: document.getElementById('clearBtn'),
  taskList: document.getElementById('taskList'),
  statsBar: document.getElementById('statsBar'),
  emptyState: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptyMsg: document.getElementById('emptyMsg'),
  toastContainer: document.getElementById('toastContainer'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  filterTabs: document.querySelectorAll('.tab'),
  helpBtn: document.getElementById('helpBtn'),
  helpModal: document.getElementById('helpModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  confirmModal: document.getElementById('confirmModal'),
  cancelConfirmBtn: document.getElementById('cancelConfirmBtn'),
  executeConfirmBtn: document.getElementById('executeConfirmBtn'),
};

// ─── Toasts ──────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    info: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
    <p>${message}</p>
    <button class="toast-close" aria-label="Close">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
    <div class="toast-progress"><div class="toast-progress-bar"></div></div>
  `;

  els.toastContainer.appendChild(toast);
  const remove = () => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  };
  toast.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, 4000);
}

// ─── Helpers ─────────────────────────────────
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const days = Math.floor(h / 24);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function esc(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}

// ─── Render ──────────────────────────────────
function render() {
  let filtered = state.tasks;
  if (state.activeFilter === 'active') filtered = filtered.filter(t => !t.completed);
  else if (state.activeFilter === 'completed') filtered = filtered.filter(t => t.completed);
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(t => t.title.toLowerCase().includes(q));
  }

  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.completed).length;
  const pending = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  els.progressText.textContent = `${pct}%`;
  els.progressBar.style.width = `${pct}%`;

  els.statsBar.textContent = total === 0
    ? 'No tasks yet'
    : `${pending} active · ${done} completed`;
  els.clearBtn.hidden = done === 0;

  if (filtered.length === 0) {
    els.emptyState.classList.add('visible');
    if (total === 0) {
      els.emptyTitle.textContent = 'No tasks yet';
      els.emptyMsg.textContent = 'Add your first task above to get started.';
    } else if (state.searchQuery) {
      els.emptyTitle.textContent = 'No results';
      els.emptyMsg.textContent = `Nothing matched "${state.searchQuery}".`;
    } else {
      els.emptyTitle.textContent = `No ${state.activeFilter} tasks`;
      els.emptyMsg.textContent = 'Try a different filter.';
    }
  } else {
    els.emptyState.classList.remove('visible');
  }

  els.taskList.innerHTML = '';
  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}`;
    li.dataset.id = task.id;
    const canDrag = state.activeFilter === 'all' && !state.searchQuery;
    li.draggable = canDrag;

    li.innerHTML = `
      <div class="check" role="checkbox" aria-checked="${task.completed}" tabindex="0">
        <div class="check-box">
          <svg class="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      </div>
      <div class="task-body">
        <span class="task-title">${esc(task.title)}</span>
        <span class="task-date">${timeAgo(task.createdAt)}</span>
      </div>
      <div class="task-actions">
        <button class="action-btn delete-btn" aria-label="Delete">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `;

    const chk = li.querySelector('.check');
    chk.addEventListener('click', () => toggleTask(task.id));
    chk.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleTask(task.id); });
    li.querySelector('.task-body').addEventListener('dblclick', () => startEdit(li, task));
    li.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); deleteTask(task.id); });

    if (canDrag) {
      li.classList.add('draggable');
      li.addEventListener('dragstart', onDragStart);
      li.addEventListener('dragover', onDragOver);
      li.addEventListener('drop', onDrop);
      li.addEventListener('dragend', onDragEnd);
    }

    els.taskList.appendChild(li);
  });
}

// ─── Drag & Drop ─────────────────────────────
function onDragStart(e) {
  state.draggedTask = this;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => this.classList.add('sortable-ghost'), 0);
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this === state.draggedTask) return;
  const mid = this.getBoundingClientRect().top + this.offsetHeight / 2;
  if (e.clientY > mid) {
    this.style.borderBottom = '2px solid var(--accent)';
    this.style.borderTop = '';
  } else {
    this.style.borderTop = '2px solid var(--accent)';
    this.style.borderBottom = '';
  }
}
function onDragEnd() {
  this.classList.remove('sortable-ghost');
  els.taskList.querySelectorAll('.task-item').forEach(i => { i.style.borderTop = ''; i.style.borderBottom = ''; });
}
async function onDrop(e) {
  e.stopPropagation();
  if (state.draggedTask === this) return;
  const mid = this.getBoundingClientRect().top + this.offsetHeight / 2;
  if (e.clientY > mid) this.after(state.draggedTask); else this.before(state.draggedTask);
  const ids = [...els.taskList.children].map(li => +li.dataset.id);
  const map = {};
  ids.forEach((id, i) => map[id] = i + 1);
  state.tasks.forEach(t => t.position = map[t.id]);
  state.tasks.sort((a, b) => a.position - b.position);
  try {
    await fetch(`${API_BASE}/tasks/reorder`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: state.tasks.map(t => ({ id: t.id, position: t.position })) })
    });
  } catch { showToast('Could not save order', 'error'); }
}

// ─── Inline Edit ─────────────────────────────
function startEdit(li, task) {
  const body = li.querySelector('.task-body');
  const saved = body.innerHTML;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit-input';
  input.value = task.title;
  input.maxLength = 200;
  body.innerHTML = '';
  body.appendChild(input);
  input.focus();
  input.select();
  let done = false;
  async function commit() {
    if (done) return; done = true;
    const v = input.value.trim();
    if (!v || v === task.title) { body.innerHTML = saved; return; }
    try {
      const r = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: v })
      });
      if (!r.ok) throw 0;
      const u = await r.json();
      const i = state.tasks.findIndex(t => t.id === task.id);
      if (i !== -1) state.tasks[i] = u;
      render();
    } catch { showToast('Rename failed', 'error'); body.innerHTML = saved; }
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { done = true; body.innerHTML = saved; }
  });
}

// ─── API ─────────────────────────────────────
async function loadTasks() {
  try {
    const r = await fetch(`${API_BASE}/tasks`);
    if (!r.ok) throw 0;
    state.tasks = await r.json();
    render();
  } catch { showToast('Could not connect to server', 'error'); els.statsBar.textContent = 'Offline'; }
}

async function addTask() {
  const title = els.taskInput.value.trim();
  if (!title) { showToast('Enter a task', 'error'); els.taskInput.focus(); return; }
  els.addBtn.disabled = true; els.taskInput.disabled = true;
  try {
    const r = await fetch(`${API_BASE}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
    state.tasks.push(await r.json());
    els.taskInput.value = '';
    if (state.activeFilter === 'completed') setFilter('all'); else render();
    showToast('Task added', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { els.addBtn.disabled = false; els.taskInput.disabled = false; els.taskInput.focus(); }
}

async function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed; render();
  try {
    const r = await fetch(`${API_BASE}/tasks/${id}`, { method: 'PUT' });
    if (!r.ok) throw 0;
    Object.assign(t, await r.json());
  } catch { t.completed = !t.completed; render(); showToast('Update failed', 'error'); }
}

async function deleteTask(id) {
  const i = state.tasks.findIndex(x => x.id === id);
  if (i === -1) return;
  const bak = state.tasks[i];
  state.tasks.splice(i, 1); render();
  try {
    const r = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    if (!r.ok) throw 0;
    showToast('Task deleted');
  } catch { state.tasks.splice(i, 0, bak); render(); showToast('Delete failed', 'error'); }
}

async function clearCompleted() {
  closeConfirm();
  const n = state.tasks.filter(t => t.completed).length;
  const bak = [...state.tasks];
  state.tasks = state.tasks.filter(t => !t.completed); render();
  try {
    const r = await fetch(`${API_BASE}/tasks/completed`, { method: 'DELETE' });
    if (!r.ok) throw 0;
    showToast(`Cleared ${n} task${n > 1 ? 's' : ''}`, 'success');
  } catch { state.tasks = bak; render(); showToast('Clear failed', 'error'); }
}

// ─── Events ──────────────────────────────────
function setFilter(f) {
  state.activeFilter = f;
  els.filterTabs.forEach(t => {
    t.classList.toggle('active', t.dataset.filter === f);
    t.setAttribute('aria-selected', t.dataset.filter === f);
  });
  render();
}
function closeConfirm() { els.confirmModal.hidden = true; }

function init() {
  els.addBtn.addEventListener('click', addTask);
  els.taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  els.searchInput.addEventListener('input', e => { state.searchQuery = e.target.value.trim(); render(); });
  els.filterTabs.forEach(t => t.addEventListener('click', () => setFilter(t.dataset.filter)));
  els.clearBtn.addEventListener('click', () => els.confirmModal.hidden = false);
  els.cancelConfirmBtn.addEventListener('click', closeConfirm);
  els.executeConfirmBtn.addEventListener('click', clearCompleted);
  els.helpBtn.addEventListener('click', () => els.helpModal.hidden = false);
  els.closeModalBtn.addEventListener('click', () => els.helpModal.hidden = true);
  els.helpModal.querySelector('.modal-overlay').addEventListener('click', () => els.helpModal.hidden = true);
  els.confirmModal.querySelector('.modal-overlay').addEventListener('click', closeConfirm);
  document.addEventListener('keydown', e => {
    const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (e.key === 'Escape') { els.helpModal.hidden = true; closeConfirm(); if (typing) document.activeElement.blur(); return; }
    if (typing) return;
    if (e.key === 'n') { e.preventDefault(); els.taskInput.focus(); }
    else if (e.key === '/') { e.preventDefault(); els.searchInput.focus(); }
    else if (e.key === '?') { e.preventDefault(); els.helpModal.hidden = !els.helpModal.hidden; }
  });
}

init();
loadTasks();
setInterval(render, 60000);
