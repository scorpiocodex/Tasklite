# TaskLite v2.0

> **Premium Tasks. Production Flow.**

TaskLite is a production-hardened, full-stack task manager built with Node.js (Express) on the backend and plain HTML, CSS, and Vanilla JavaScript on the frontend. Version 2.0 brings a stunning glassmorphism UI, SQLite persistence, and a highly modular architecture.

---

## Features

- **SQLite Persistence** — completely reliable disk-backed storage using `better-sqlite3`.
- **Drag & Drop** — Native reordering of tasks synced live to the database.
- **Modern Glassmorphism UI** — Premium gradients, sleek micro-animations, and custom fonts.
- **Search & Filter** — Instant debounced client-side searching with active/completed tabs.
- **Optimistic UI** — Instant interactions combined with a background sync mechanism.
- **Keyboard Shortcuts** — Navigate without a mouse (`n`, `/`, `t`, `?`).
- **Dark/Light Theme** — OS-synced with a manual override toggle.
- **Automated Tests** — Fully verified via exhaustive Jest API tests.
- **Sci-Fi CLI** — Beautiful, colored backend logging mechanism.
- **API Security** — Helmet headers, rate limiting, and robust error handling.

---

## Tech Stack

| Layer     | Technology               |
|-----------|--------------------------|
| Backend   | Node.js ≥16, Express 4.21 |
| DB        | SQLite (`better-sqlite3`) |
| Frontend  | HTML5, CSS3, Vanilla JS  |
| Testing   | Jest, Supertest          |

---

## Project Structure

```
tasklite/
│
├── server/
│   ├── server.js        # Express REST API (Entry & Config)
│   ├── routes.js        # Controller layer
│   ├── middleware.js    # Security, Validation, Logging
│   ├── database.js      # SQLite connection & schemas
│   ├── config.js        # Config mapping from Env vars
│   ├── server.test.js   # Jest test suites
│   ├── tasklite.db      # SQLite data file (Gitignored)
│   └── package.json     # Node dependencies
│
├── client/              # Served statically by backend
│   ├── index.html       # App shell
│   ├── style.css        # Premium glassmorphism
│   └── script.js        # State, API fetching, drag & drop
│
└── README.md
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Start the Application

The backend will automatically start serving the frontend on port 5000 via statically allocated middleware.

```bash
npm start
```

### 3. Open the Dashboard

Open `http://localhost:5000` directly in your browser.

### 4. Run API Tests

Ensure zero regressions in the REST logic:
```bash
npm test
```

---

## API Endpoints

| Method | Endpoint      | Description                | Request Body              | Status |
|--------|---------------|----------------------------|---------------------------|--------|
| GET    | `/tasks`      | Get all tasks              | —                         | 200    |
| GET    | `/tasks?search=word`| Search tasks         | —                         | 200    |
| POST   | `/tasks`      | Add a new task             | `{ "title": "..." }`      | 201    |
| PUT    | `/tasks/:id`  | Toggle task completion     | —                         | 200    |
| PATCH  | `/tasks/:id`  | Update task title          | `{ "title": "..." }`      | 200    |
| PUT    | `/tasks/reorder` | Update task positions  | `{ "updates": [...] }`    | 200    |
| DELETE | `/tasks/completed`| Bulk purge completed | —                         | 200    |
| DELETE | `/tasks/:id`  | Delete a task              | —                         | 200    |

---

> **Note:** The backend must be running before you open the frontend.

---

## Known Limitations

- **In-memory storage** — all tasks are lost when the server restarts (no database)
- CORS is open to all origins (`*`) — suitable for local development only; restrict in production
- No authentication or multi-user support

---

## Manual Testing Checklist

| Test                               | Expected Result                                   |
|------------------------------------|---------------------------------------------------|
| Add a task                         | Task appears with slide-in animation              |
| Add empty task                     | Error shown, auto-dismisses after 4 s             |
| Add task > 200 chars               | Server returns 400; error shown                   |
| Click task row                     | Toggled immediately (optimistic); confirmed by server |
| Double-click task title            | Inline input appears                              |
| Edit title → Enter                 | Title updated via PATCH                           |
| Edit title → Escape                | Original title restored, no request sent          |
| Delete task                        | Removed immediately (optimistic); confirmed       |
| Filter: Active                     | Only incomplete tasks shown                       |
| Filter: Completed                  | Only completed tasks shown                        |
| Clear completed                    | All completed tasks deleted                       |
| Pending badge                      | Shows count of active tasks                       |
| Dark mode (OS set to dark)         | Full dark theme applied automatically             |
| Refresh page                       | Tasks load instantly from localStorage            |
| Restart server + refresh           | Background sync reconciles with empty server      |
| `PUT /tasks/abc`                   | Returns 400 JSON (not 404)                        |
| `GET /unknown`                     | Returns 404 JSON (not HTML)                       |

---

## License

MIT
