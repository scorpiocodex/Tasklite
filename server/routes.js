const express = require('express');
const router = express.Router();
const db = require('./database');
const { validateId, validateTitle } = require('./middleware');

// Prepare statements for performance
const stmtGetTasks = db.prepare(`SELECT * FROM tasks ORDER BY position ASC, id ASC`);
const stmtSearchTasks = db.prepare(`SELECT * FROM tasks WHERE title LIKE ? ORDER BY position ASC, id ASC`);
const stmtInsertTask = db.prepare(`INSERT INTO tasks (title, completed, position, createdAt, updatedAt) VALUES (?, 0, ?, ?, ?)`);
const stmtGetTask = db.prepare(`SELECT * FROM tasks WHERE id = ?`);
const stmtUpdateCompletion = db.prepare(`UPDATE tasks SET completed = ?, updatedAt = ? WHERE id = ?`);
const stmtUpdateTitle = db.prepare(`UPDATE tasks SET title = ?, updatedAt = ? WHERE id = ?`);
const stmtUpdatePosition = db.prepare(`UPDATE tasks SET position = ?, updatedAt = ? WHERE id = ?`);
const stmtDeleteTask = db.prepare(`DELETE FROM tasks WHERE id = ?`);
const stmtDeleteCompleted = db.prepare(`DELETE FROM tasks WHERE completed = 1`);
// helper statement to find the max position to append new tasks to the end
const stmtMaxPosition = db.prepare(`SELECT MAX(position) as maxPos FROM tasks`);

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', version: '2.0.0' });
});

router.get('/tasks', (req, res, next) => {
    try {
        const search = req.query.search;
        let rows;
        if (search) {
            rows = stmtSearchTasks.all(`%${search}%`);
        } else {
            rows = stmtGetTasks.all();
        }

        // SQLite returns numbers for booleans: 0 or 1.
        const tasks = rows.map(t => ({
            ...t,
            completed: t.completed === 1
        }));

        res.status(200).json(tasks);
    } catch (err) {
        next(err);
    }
});

router.post('/tasks', validateTitle, (req, res, next) => {
    try {
        const title = req.validTitle;
        const now = new Date().toISOString();
        const maxRow = stmtMaxPosition.get();
        const position = maxRow.maxPos ? maxRow.maxPos + 1 : 1;

        const info = stmtInsertTask.run(title, position, now, now);

        const newTask = {
            id: info.lastInsertRowid,
            title,
            completed: false,
            position,
            createdAt: now,
            updatedAt: now
        };

        res.status(201).json(newTask);
    } catch (err) {
        next(err);
    }
});

router.put('/tasks/reorder', (req, res, next) => {
    try {
        const { updates } = req.body; // Expects an array of { id, position }

        if (!updates || !Array.isArray(updates)) {
            return next({ status: 400, message: 'Invalid payload for reorder. Expected an array of updates.' });
        }

        const now = new Date().toISOString();

        // Use transaction for multiple updates
        const transaction = db.transaction((updates) => {
            updates.forEach(update => {
                if (update.id && typeof update.position === 'number') {
                    stmtUpdatePosition.run(update.position, now, update.id);
                }
            });
        });

        transaction(updates);

        res.status(200).json({ message: 'Reorder successful' });
    } catch (err) {
        next(err);
    }
});

router.put('/tasks/:id', validateId, (req, res, next) => {
    try {
        const taskRow = stmtGetTask.get(req.taskId);
        if (!taskRow) {
            return next({ status: 404, message: `Task with id ${req.taskId} not found.` });
        }

        const newCompletedState = taskRow.completed === 1 ? 0 : 1;
        const now = new Date().toISOString();

        stmtUpdateCompletion.run(newCompletedState, now, req.taskId);

        res.status(200).json({
            ...taskRow,
            completed: newCompletedState === 1,
            updatedAt: now
        });
    } catch (err) {
        next(err);
    }
});

router.patch('/tasks/:id', validateId, validateTitle, (req, res, next) => {
    try {
        const taskRow = stmtGetTask.get(req.taskId);
        if (!taskRow) {
            return next({ status: 404, message: `Task with id ${req.taskId} not found.` });
        }

        const now = new Date().toISOString();
        stmtUpdateTitle.run(req.validTitle, now, req.taskId);

        res.status(200).json({
            ...taskRow,
            title: req.validTitle,
            completed: taskRow.completed === 1,
            updatedAt: now
        });
    } catch (err) {
        next(err);
    }
});

router.delete('/tasks/completed', (req, res, next) => {
    try {
        stmtDeleteCompleted.run();
        res.status(200).json({ message: 'Completed tasks deleted successfully.' });
    } catch (err) {
        next(err);
    }
});

router.delete('/tasks/:id', validateId, (req, res, next) => {
    try {
        const info = stmtDeleteTask.run(req.taskId);
        if (info.changes === 0) {
            return next({ status: 404, message: `Task with id ${req.taskId} not found.` });
        }
        res.status(200).json({ message: `Task ${req.taskId} deleted successfully.` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
