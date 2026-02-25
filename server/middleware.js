/**
 * Validation and Error Handling Middleware
 */

function validateId(req, res, next) {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return next({ status: 400, message: 'Task ID must be a valid integer.' });
    }
    req.taskId = id;
    next();
}

function validateTitle(req, res, next) {
    if (!req.body || typeof req.body !== 'object') {
        return next({ status: 400, message: 'Request body must be a JSON object.' });
    }

    const raw = req.body.title;
    if (typeof raw !== 'string' || raw.trim() === '') {
        return next({ status: 400, message: 'Task title cannot be empty.' });
    }
    const title = raw.trim();
    if (title.length > 200) {
        return next({ status: 400, message: 'Task title must be 200 characters or fewer.' });
    }

    req.validTitle = title;
    next();
}

function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    if (status >= 500 && process.env.NODE_ENV !== 'test') {
        console.error(`[ERROR] ${err.stack || err.message || err}`);
    }

    res.status(status).json({
        error: message,
        code: status,
        details: err.details || null
    });
}

function requestLogger(req, res, next) {
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        let color = '\x1b[32m'; // green
        if (res.statusCode >= 400 && res.statusCode < 500) color = '\x1b[33m'; // yellow
        if (res.statusCode >= 500) color = '\x1b[31m'; // red
        const resetColor = '\x1b[0m';
        console.log(`${req.method} ${req.path} -> ${color}${res.statusCode}${resetColor} (${ms}ms)`);
    });
    next();
}

module.exports = {
    validateId,
    validateTitle,
    errorHandler,
    requestLogger
};
