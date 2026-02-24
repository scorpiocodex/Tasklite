# TaskLite

> **Simple Tasks. Clean Flow.**

TaskLite is a production-hardened, full-stack task manager built with Node.js (Express) on the backend and plain HTML, CSS, and Vanilla JavaScript on the frontend.

---

## Features

- Add tasks (title validated: 1–200 characters)
- Mark tasks as complete / incomplete (toggle) with **optimistic UI**
- Delete tasks with **optimistic UI**
- **Inline title editing** — double-click any task title to edit, Enter to save, Escape to cancel
- **Filter tabs** — All | Active | Completed
- **"Clear completed"** button — bulk-deletes all finished tasks
- **Pending badge** — live count of remaining tasks in the header
- **Dark mode** — automatic via `prefers-color-scheme`
- **LocalStorage persistence** — instant display on page load; silently syncs with backend in background
- Structured request logging on the server
- Graceful shutdown (`SIGINT` / `SIGTERM`)
- JSON error responses for all routes (no HTML error pages)
- Entrance animation for task items
- Fully keyboard-navigable with visible focus rings
- `<noscript>` fallback banner

---

## Tech Stack

| Layer     | Technology               |
|-----------|--------------------------|
| Backend   | Node.js ≥16, Express 4, CORS |
| Frontend  | HTML5, CSS3, Vanilla JS (ES2020) |
| Storage   | In-memory (server) + LocalStorage (client) |

---

## Project Structure

```
tasklite/
│
├── server/
│   ├── server.js        # Express REST API
│   └── package.json     # Node dependencies
│
├── client/
│   ├── index.html       # App shell
│   ├── style.css        # Styling (light + dark themes)
│   └── script.js        # Frontend logic (state module)
│
└── README.md
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `5000`  | Port the server listens on |

Example:
```bash
PORT=8080 npm start
```

---

## API Endpoints

| Method | Endpoint      | Description                | Request Body              | Status Codes |
|--------|---------------|----------------------------|---------------------------|--------------|
| GET    | `/tasks`      | Get all tasks              | —                         | 200          |
| POST   | `/tasks`      | Add a new task             | `{ "title": "..." }`      | 201, 400     |
| PUT    | `/tasks/:id`  | Toggle task completion     | —                         | 200, 400, 404 |
| PATCH  | `/tasks/:id`  | Update task title          | `{ "title": "..." }`      | 200, 400, 404 |
| DELETE | `/tasks/:id`  | Delete a task              | —                         | 200, 400, 404 |

### Task Object

```json
{
  "id": 1,
  "title": "Buy groceries",
  "completed": false,
  "createdAt": "2026-02-24T10:00:00.000Z",
  "updatedAt": "2026-02-24T10:05:00.000Z"
}
```

### Validation Rules

- Title must be a non-empty string of **1–200 characters**
- `:id` must be a valid integer — invalid IDs return `400` (not `404`)
- Request body must be a valid JSON object where required

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Start the Backend

**Production:**
```bash
npm start
```

**Development (auto-restart on file changes):**
```bash
npm run dev
```

The server prints a structured startup log:
```
─────────────────────────────────────────
  TaskLite Server v1.1.0
  URL  : http://localhost:5000
  Time : 2026-02-24T10:00:00.000Z
─────────────────────────────────────────
```

### 3. Open the Frontend

Open `client/index.html` directly in your browser:

```bash
# Windows
start ../client/index.html

# macOS
open ../client/index.html

# Linux
xdg-open ../client/index.html
```

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
