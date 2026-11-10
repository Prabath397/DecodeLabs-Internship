# TaskFlow API

Base URL: `http://127.0.0.1:3000/api`

Every non-204 response is JSON. Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. Validation errors also include a field-level `details` array.

## Endpoints

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/api` | API information and route list | 200 |
| GET | `/api/health` | Health and current server timestamp | 200 |
| GET | `/api/tasks` | List, filter, search, and sort tasks | 200 |
| GET | `/api/tasks/:id` | Retrieve one task | 200 |
| POST | `/api/tasks` | Create a task | 201 |
| PUT | `/api/tasks/:id` | Update editable task fields | 200 |
| PATCH | `/api/tasks/:id/status` | Complete or reopen a task | 200 |
| DELETE | `/api/tasks/:id` | Delete a task with no response body | 204 |
| GET | `/api/stats` | Calculate dashboard statistics | 200 |

Recognized endpoints return 405 and an `Allow` header for unsupported methods.

## Task fields

`title` is required for POST and PUT, must be a string, is trimmed, and must contain 3–120 characters. `description` is optional, must be a string, and is limited to 1000 characters. `category` accepts `Assignments`, `Projects`, `Exams`, `Personal`, or `Other`; its default is `Other`. `priority` accepts `Low`, `Medium`, or `High`; its default is `Medium`. `status` accepts `Pending` or `Completed`; its default is `Pending`. `dueDate` is optional and accepts a real calendar date in `YYYY-MM-DD` format or `null`.

The server creates and controls `id`, `createdAt`, `updatedAt`, and `completedAt`. Unknown fields are rejected.

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Complete JavaScript assignment","description":"Finish the API exercises","category":"Assignments","priority":"High","dueDate":"2026-11-15"}'
```

Creation returns the complete task:

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Complete JavaScript assignment",
    "description": "Finish the API exercises",
    "category": "Assignments",
    "priority": "High",
    "status": "Pending",
    "dueDate": "2026-11-15",
    "createdAt": "2026-11-03T10:00:00.000Z",
    "updatedAt": "2026-11-03T10:00:00.000Z",
    "completedAt": null
  }
}
```

```bash
curl http://127.0.0.1:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000
curl -X PUT http://127.0.0.1:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000 -H "Content-Type: application/json" -d '{"title":"Revise JavaScript assignment","description":"Review all exercises","category":"Assignments","priority":"Medium","dueDate":"2026-11-16"}'
curl -X PATCH http://127.0.0.1:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/status -H "Content-Type: application/json" -d '{"status":"Completed"}'
curl -X DELETE http://127.0.0.1:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000
```

## Listing and statistics

Supported filters are `status`, `priority`, and `category`. `search` checks title and description case-insensitively and accepts up to 200 characters. `sortBy` accepts `dueDate`, `createdAt`, `priority`, or `title`; `order` accepts `asc` or `desc`. Query parameters must appear only once. Tasks without due dates always follow dated tasks when sorting by due date.

```bash
curl "http://127.0.0.1:3000/api/tasks?category=Projects&status=Pending"
curl "http://127.0.0.1:3000/api/tasks?search=assignment"
curl "http://127.0.0.1:3000/api/tasks?sortBy=dueDate&order=asc"
curl http://127.0.0.1:3000/api/stats
```

Statistics include `totalTasks`, `completedTasks`, `pendingTasks`, `overdueTasks`, `completionPercentage`, and up to five pending `upcomingDeadlines`. Overdue calculations use the `Asia/Colombo` calendar date. Empty collections report 0% completion.

## Errors and status codes

Validation errors include field-level `details`:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid task data",
    "details": [{ "field": "title", "message": "Title must contain at least 3 characters" }]
  }
}
```

The API uses 200 for successful reads and updates, 201 for creation, 204 for deletion, 400 for invalid input or malformed JSON, 404 for missing tasks or endpoints, 405 for unsupported recognized methods, 413 for oversized bodies, 429 when the local request limit is exceeded, and 500 for unexpected failures. Internal stack traces are never returned.
