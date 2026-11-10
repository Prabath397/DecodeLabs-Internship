# TaskFlow — Student Productivity Dashboard

TaskFlow began as a browser-only responsive frontend for DecodeLabs Project 1. Project 2 adds a Node.js and Express REST API, persistent JSON storage, server-side validation, dashboard statistics, automated tests, and Fetch API integration.

## Requirements and setup

- Node.js 22 LTS or newer supported LTS release
- npm

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`. The frontend and API use the same Express server, so no CORS configuration is needed. During development, `npm run dev` restarts the server after source changes. Run tests with `npm test`.

Environment settings can be copied from `.env.example` into the shell or a local process manager. The application does not load `.env` files automatically, keeping dependencies minimal.

## Features

- Create, view, edit, complete, reopen, search, filter, sort, and delete tasks
- Server-owned UUIDs and timestamps
- Validated JSON requests and query parameters
- Atomic JSON-file writes with serialized mutations
- Live dashboard totals, overdue counts, completion percentage, and upcoming deadlines
- Loading, network-error, validation-error, and duplicate-submission handling
- Optional one-time import of legacy `taskflowTasks` or `tasks` localStorage data
- Request size limiting, local rate limiting, security headers, safe errors, method handling, and graceful shutdown
- Isolated automated API and repository tests

Theme preference remains in localStorage. Tasks are stored only by the server in `server/data/tasks.json`.

## Structure

```text
css/style.css                 Responsive interface styles
js/api.js                     Central Fetch API client
js/app.js                     UI state and interactions
server/app.js                 Express application composition
server/server.js              Process startup and shutdown
server/routes/                API route definitions
server/controllers/           HTTP response handling
server/services/              Task and statistics logic
server/repositories/          JSON persistence
server/middleware/            Validation, rate limiting, errors
server/data/tasks.json        Persistent user task data
tests/api.test.js             API and storage tests
API.md                        Full API reference
```

## API and persistence

The API base URL is `http://127.0.0.1:3000/api`. See [API.md](API.md) for endpoints, validation, examples, and response formats.

The repository reads existing JSON during startup and never replaces malformed storage. Changes are queued, written to a temporary file, then atomically renamed. Tests use temporary storage and never modify user data.

## Calendar policy and limitations

Task dates are calendar-only `YYYY-MM-DD` values. Overdue calculations use the current date in `Asia/Colombo`; a pending due date earlier than today is overdue. Timestamps are ISO 8601 UTC values.

This is a local educational, single-user application. It has no authentication, authorization, multi-user isolation, distributed locking, or cross-process write coordination and must not be presented as a production-secure hosted service. The in-memory rate-limit state resets when the server restarts.
