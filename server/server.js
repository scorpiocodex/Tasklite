const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = '1.1.0';

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

// CORS — open for dev; restrict origins in production via env
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Body parser with 16kb limit to block payload flooding
app.use(express.json({ limit: '16kb' }));

// Request logger — method · path · status · ms
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ─────────────────────────────────────────────
// In-memory task store
// ─────────────────────────────────────────────
let tasks = [];
let nextId = 1;

// ─────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────

/**
 * Parse and validate a task ID from a route param.
 * Returns { id: number } on success or { error: string } on failure.
 */
function parseId(param) {
  const id = parseInt(param, 10);
  if (Number.isNaN(id)) {
    return { error: 'Task ID must be a valid integer.' };
  }
  return { id };
}

/**
 * Validate a title string.
 * Must be a non-empty string of 1–200 characters.
 * Returns { title: string } on success or { error: string } on failure.
 */
function validateTitle(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { error: 'Task title cannot be empty.' };
  }
  const title = raw.trim();
  if (title.length > 200) {
    return { error: 'Task title must be 200 characters or fewer.' };
  }
  return { title };
}

// ─────────────────────────────────────────────
// GET /tasks — Retrieve all tasks
// ─────────────────────────────────────────────
app.get('/tasks', (req, res) => {
  res.status(200).json(tasks);
});

// ─────────────────────────────────────────────
// POST /tasks — Create a new task
// Body: { "title": "Task title" }
// ─────────────────────────────────────────────
app.post('/tasks', (req, res) => {
  // Guard against missing or non-object body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { error, title } = validateTitle(req.body.title);
  if (error) {
    return res.status(400).json({ error });
  }

  const now = new Date().toISOString();
  const newTask = {
    id: nextId++,
    title,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

// ─────────────────────────────────────────────
// PUT /tasks/:id — Toggle task completion status
// ─────────────────────────────────────────────
app.put('/tasks/:id', (req, res) => {
  const { error, id } = parseId(req.params.id);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task with id ${id} not found.` });
  }

  task.completed = !task.completed;
  task.updatedAt = new Date().toISOString();

  res.status(200).json(task);
});

// ─────────────────────────────────────────────
// PATCH /tasks/:id — Update task title (inline edit)
// Body: { "title": "New title" }
// ─────────────────────────────────────────────
app.patch('/tasks/:id', (req, res) => {
  const { error: idError, id } = parseId(req.params.id);
  if (idError) {
    return res.status(400).json({ error: idError });
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { error: titleError, title } = validateTitle(req.body.title);
  if (titleError) {
    return res.status(400).json({ error: titleError });
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task with id ${id} not found.` });
  }

  task.title = title;
  task.updatedAt = new Date().toISOString();

  res.status(200).json(task);
});

// ─────────────────────────────────────────────
// DELETE /tasks/:id — Remove a task by ID
// ─────────────────────────────────────────────
app.delete('/tasks/:id', (req, res) => {
  const { error, id } = parseId(req.params.id);
  if (error) {
    return res.status(400).json({ error });
  }

  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Task with id ${id} not found.` });
  }

  tasks.splice(index, 1);
  res.status(200).json({ message: `Task ${id} deleted successfully.` });
});

// ─────────────────────────────────────────────
// 404 catch-all — unknown routes return JSON
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  TaskLite Server v${VERSION}`);
  console.log(`  URL  : http://localhost:${PORT}`);
  console.log(`  Time : ${new Date().toISOString()}`);
  console.log('─────────────────────────────────────────');
});

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
