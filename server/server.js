const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, requestLogger } = require('./middleware');

const app = express();

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS — open for dev; restrict origins in production via env
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Rate limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.use(limiter);

// Body parser with 16kb limit to block payload flooding
app.use(express.json({ limit: '16kb' }));

// Request logger
app.use(requestLogger);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../client')));

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use(routes);

// ─────────────────────────────────────────────
// 404 catch-all
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  next({ status: 404, message: `Route ${req.method} ${req.path} not found.` });
});

// ─────────────────────────────────────────────
// Error handling middleware
// ─────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────
// Start the server (Only if not imported as module)
// ─────────────────────────────────────────────
if (require.main === module) {
  const server = app.listen(config.port, () => {
    // Sci-Fi Grade Terminal UI
    const cyan = '\x1b[36m';
    const indigo = '\x1b[38;5;63m';
    const accent = '\x1b[38;5;141m';
    const gray = '\x1b[90m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    console.log('');
    console.log(`${indigo}▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰${reset}`);
    console.log(`${cyan}   [✧] TASKLITE CORE EXECUTABLE ${bold}v${config.version}${reset}`);
    console.log(`${gray}   Initializing background sync matrices...${reset}`);
    console.log(`${indigo}▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰${reset}`);
    console.log(`${accent}  ▶ GATEWAY : ${reset}http://localhost:${config.port}`);
    console.log(`${accent}  ▶ ORIGIN  : ${reset}${config.corsOrigin}`);
    console.log(`${accent}  ▶ TIME    : ${reset}${new Date().toISOString()}`);
    console.log(`${accent}  ▶ STATUS  : ${cyan}ONLINE & SECURE${reset}`);
    console.log(`${indigo}────────────────────────────────────────────────────────────────────────${reset}`);
    console.log(`${gray}  Waiting for neural inputs...${reset}\n`);
  });

  // Graceful shutdown
  function shutdown(signal) {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} else {
  // Export app for testing
  module.exports = app;
}
