// =============================================
// TaskLite — script.js  v1.1.0
// State-module architecture with optimistic UI,
// filters, inline edit, and background sync.
// =============================================

const API_BASE = 'http://localhost:5000';
const LS_KEY = 'tasklite_tasks';

// ─────────────────────────────────────────────
// Application State
// ─────────────────────────────────────────────
const state = {
  tasks: [],          // Source of truth for the current session
  activeFilter: 'all', // 'all' | 'active' | 'completed'
};

// ─────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────
const taskInput       = document.getElementById('taskInput');
const addBtn          = document.getElementById('addBtn');
const taskList        = document.getElementById('taskList');
const errorMsg        = document.getElementById('errorMsg');
const statsBar        = document.getElementById('statsBar');
const emptyState      = document.getElementById('emptyState');
const emptyMsg        = document.getElementById('emptyMsg');
const pendingBadge    = document.getElementById('pendingBadge');
const clearCompletedRow = document.getElementById('clearCompletedRow');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterTabs      = document.querySelectorAll('.filter-tab');

// Auto-dismiss error timer handle
let errorTimer = null;

// ─────────────────────────────────────────────
// LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────
function saveToLocalStorage(tasks) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('TaskLite: localStorage write failed —', e.message);
  }
}

function loadFromLocalStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// LOADING STATE (addBtn spinner)
// ─────────────────────────────────────────────
function setLoading(isLoading) {
  addBtn.disabled = isLoading;
  if (isLoading) {
    addBtn.classList.add('loading');
  } else {
    addBtn.classList.remove('loading');
  }
}

// ─────────────────────────────────────────────
// ERROR HELPERS (auto-dismiss after 4 s)
// ─────────────────────────────────────────────
function showError(message) {
  clearTimeout(errorTimer);
  errorMsg.textContent = message;
  errorTimer = setTimeout(clearError, 4000);
}

function clearError() {
  clearTimeout(errorTimer);
  errorMsg.textContent = '';
}

// ─────────────────────────────────────────────
// XSS HELPER
// ─────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ─────────────────────────────────────────────
// FILTER LOGIC
// ─────────────────────────────────────────────
function getFilteredTasks() {
  switch (state.activeFilter) {
    case 'active':
      return state.tasks.filter((t) => !t.completed);
    case 'completed':
      return state.tasks.filter((t) => t.completed);
    default:
      return state.tasks;
  }
}

// ─────────────────────────────────────────────
// RENDER — Builds DOM from state
// ─────────────────────────────────────────────
function render() {
  const filtered = getFilteredTasks();
  const total    = state.tasks.length;
  const done     = state.tasks.filter((t) => t.completed).length;
  const pending  = total - done;

  // Pending badge
  if (pending > 0) {
    pendingBadge.textContent = pending;
    pendingBadge.hidden = false;
  } else {
    pendingBadge.hidden = true;
  }

  // Clear completed button visibility
  if (done > 0) {
    clearCompletedRow.hidden = false;
  } else {
    clearCompletedRow.hidden = true;
  }

  // Stats bar
  if (total === 0) {
    statsBar.textContent = '';
  } else {
    statsBar.textContent = `${total} task${total !== 1 ? 's' : ''} · ${done} completed · ${pending} remaining`;
  }

  // Empty state
  if (filtered.length === 0) {
    emptyState.classList.add('visible');
    if (total > 0) {
      emptyMsg.textContent = `No ${state.activeFilter} tasks.`;
    } else {
      emptyMsg.textContent = 'No tasks yet. Add one above!';
    }
  } else {
    emptyState.classList.remove('visible');
  }

  // Rebuild task list
  taskList.innerHTML = '';
  filtered.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}`;
    li.setAttribute('data-id', task.id);
    li.setAttribute('title', 'Click to toggle · Double-click to edit');

    li.innerHTML = `
      <div class="task-checkbox" aria-hidden="true"></div>
      <span class="task-title" title="Double-click to edit">${escapeHtml(task.title)}</span>
      <div class="delete-area">
        <button class="btn btn-danger" data-id="${task.id}" title="Delete task" aria-label="Delete task">✕</button>
      </div>
    `;

    // Toggle on row click (but not delete area)
    li.addEventListener('click', (e) => {
      if (e.target.closest('.delete-area')) return;
      toggleTask(task.id);
    });

    // Inline edit on double-click of the title span
    li.querySelector('.task-title').addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startInlineEdit(li, task);
    });

    // Delete
    li.querySelector('.btn-danger').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });

    taskList.appendChild(li);
  });

  // Persist to localStorage
  saveToLocalStorage(state.tasks);
}

// ─────────────────────────────────────────────
// INLINE EDIT
// Double-click title → input; Enter/blur → PATCH; Escape → cancel
// ─────────────────────────────────────────────
function startInlineEdit(li, task) {
  const titleSpan = li.querySelector('.task-title');
  const originalTitle = task.title;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-title-input';
  input.value = originalTitle;
  input.maxLength = 200;

  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  let committed = false;

  async function commitEdit() {
    if (committed) return;
    committed = true;

    const newTitle = input.value.trim();

    if (!newTitle || newTitle === originalTitle) {
      // Nothing changed or cleared — restore original
      input.replaceWith(titleSpan);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        showError(data.error || 'Could not update task title.');
        input.replaceWith(titleSpan);
        return;
      }

      const updated = await response.json();
      // Update state in-place
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx !== -1) {
        state.tasks[idx] = updated;
      }
      render();
    } catch {
      showError('Could not connect to the server.');
      input.replaceWith(titleSpan);
    }
  }

  function cancelEdit() {
    if (committed) return;
    committed = true;
    input.replaceWith(titleSpan);
  }

  input.addEventListener('blur', commitEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur(); // triggers commitEdit via blur
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  });
}

// ─────────────────────────────────────────────
// FETCH ALL TASKS (background sync)
// ─────────────────────────────────────────────
async function fetchTasks() {
  const response = await fetch(`${API_BASE}/tasks`);
  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }
  return response.json();
}

// ─────────────────────────────────────────────
// INITIALIZATION
// Render from localStorage immediately, then sync with backend silently
// ─────────────────────────────────────────────
async function init() {
  const cached = loadFromLocalStorage();

  if (cached && Array.isArray(cached)) {
    state.tasks = cached;
    render();
  }

  // Background sync — reconcile with backend
  try {
    const serverTasks = await fetchTasks();
    state.tasks = serverTasks;
    render();
  } catch {
    if (!cached) {
      showError('Could not connect to the server. Is it running?');
    }
    // If we had cached data, just keep it displayed — no error spam
  }
}

// ─────────────────────────────────────────────
// ADD TASK
// ─────────────────────────────────────────────
async function addTask() {
  const title = taskInput.value.trim();

  if (!title) {
    showError('Please enter a task title.');
    taskInput.focus();
    return;
  }

  clearError();
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showError(data.error || 'Failed to add task.');
      return;
    }

    const newTask = await response.json();
    state.tasks.push(newTask);
    taskInput.value = '';
    render();
  } catch {
    showError('Could not connect to the server.');
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────────────────────
// TOGGLE TASK COMPLETION (optimistic)
// ─────────────────────────────────────────────
async function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  // Optimistic update
  const originalCompleted = task.completed;
  task.completed = !task.completed;
  render();

  try {
    const response = await fetch(`${API_BASE}/tasks/${id}`, { method: 'PUT' });

    if (!response.ok) {
      // Roll back
      task.completed = originalCompleted;
      render();
      showError('Could not update task.');
      return;
    }

    const updated = await response.json();
    const idx = state.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      state.tasks[idx] = updated;
    }
    render();
  } catch {
    // Roll back
    task.completed = originalCompleted;
    render();
    showError('Could not connect to the server.');
  }
}

// ─────────────────────────────────────────────
// DELETE TASK (optimistic)
// ─────────────────────────────────────────────
async function deleteTask(id) {
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;

  // Optimistic removal
  const [removed] = state.tasks.splice(idx, 1);
  render();

  try {
    const response = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });

    if (!response.ok) {
      // Roll back — reinsert at original position
      state.tasks.splice(idx, 0, removed);
      render();
      showError('Could not delete task.');
    }
  } catch {
    // Roll back
    state.tasks.splice(idx, 0, removed);
    render();
    showError('Could not connect to the server.');
  }
}

// ─────────────────────────────────────────────
// CLEAR COMPLETED
// Loop through completed tasks and DELETE each
// ─────────────────────────────────────────────
async function clearCompleted() {
  const completed = state.tasks.filter((t) => t.completed);
  if (completed.length === 0) return;

  // Optimistic removal of all completed tasks
  state.tasks = state.tasks.filter((t) => !t.completed);
  render();

  // Fire all DELETEs in parallel
  const results = await Promise.allSettled(
    completed.map((task) =>
      fetch(`${API_BASE}/tasks/${task.id}`, { method: 'DELETE' })
    )
  );

  // Check if any failed
  const failed = results.filter((r) => r.status === 'rejected' || (r.value && !r.value.ok));
  if (failed.length > 0) {
    showError(`${failed.length} task(s) could not be deleted. Please refresh.`);
    // Re-sync from server
    try {
      const serverTasks = await fetchTasks();
      state.tasks = serverTasks;
      render();
    } catch {
      // Best-effort — keep optimistic state
    }
  }
}

// ─────────────────────────────────────────────
// FILTER TABS
// ─────────────────────────────────────────────
function setFilter(filter) {
  state.activeFilter = filter;
  filterTabs.forEach((tab) => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  render();
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────

// Add task
addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

taskInput.addEventListener('input', clearError);

// Filter tabs
filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => setFilter(tab.dataset.filter));
});

// Clear completed
clearCompletedBtn.addEventListener('click', clearCompleted);

// ─────────────────────────────────────────────
// KICK OFF THE APP
// ─────────────────────────────────────────────
init();
