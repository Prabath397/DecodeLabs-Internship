const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server/app');
const { createConfig } = require('../server/config');
const { TaskRepository } = require('../server/repositories/taskRepository');

async function withServer(run, configOverrides = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taskflow-test-'));
  const dataFile = path.join(directory, 'tasks.json');
  const config = createConfig({ dataFile, publicDirectory: path.resolve(__dirname, '..'), rateLimitMax: 10000, ...configOverrides });
  const { app } = await createApp(config, { now: () => new Date('2026-11-03T10:00:00.000Z') });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, { ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers } });
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
  };
  try { await run({ request, dataFile }); } finally { await new Promise((resolve) => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }); }
}

const validTask = { title: 'Complete assignment', description: 'API exercises', category: 'Assignments', priority: 'High', dueDate: '2026-11-15' };

test('health endpoint and empty collection', () => withServer(async ({ request }) => {
  const health = await request('/api/health');
  assert.equal(health.response.status, 200); assert.equal(health.body.data.status, 'ok');
  const tasks = await request('/api/tasks');
  assert.equal(tasks.response.status, 200); assert.deepEqual(tasks.body.data, []); assert.equal(tasks.body.count, 0);
}));

test('creates and retrieves a task with server fields', () => withServer(async ({ request }) => {
  const created = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ ...validTask, id: undefined }) });
  assert.equal(created.response.status, 201); assert.match(created.body.data.id, /^[0-9a-f-]{36}$/); assert.equal(created.body.data.status, 'Pending'); assert.equal(created.body.data.completedAt, null);
  const found = await request(`/api/tasks/${created.body.data.id}`);
  assert.equal(found.response.status, 200); assert.equal(found.body.data.title, validTask.title);
}));

test('rejects invalid task inputs', () => withServer(async ({ request }) => {
  for (const [input, field] of [[{ priority: 'High' }, 'title'], [{ ...validTask, priority: 'Urgent' }, 'priority'], [{ ...validTask, category: 'School' }, 'category'], [{ ...validTask, dueDate: '2026-02-30' }, 'dueDate'], [{ ...validTask, id: 'client-id' }, 'id']]) {
    const result = await request('/api/tasks', { method: 'POST', body: JSON.stringify(input) });
    assert.equal(result.response.status, 400); assert.ok(result.body.error.details.some((detail) => detail.field === field));
  }
}));

test('returns 404 for missing task', () => withServer(async ({ request }) => {
  const result = await request('/api/tasks/00000000-0000-4000-8000-000000000000');
  assert.equal(result.response.status, 404); assert.equal(result.body.error.code, 'TASK_NOT_FOUND');
}));

test('rejects invalid task identifiers', () => withServer(async ({ request }) => {
  const result = await request('/api/tasks/not-a-uuid');
  assert.equal(result.response.status, 400); assert.equal(result.body.error.code, 'INVALID_TASK_ID');
}));

test('updates, completes, reopens, and deletes a task', () => withServer(async ({ request }) => {
  const created = await request('/api/tasks', { method: 'POST', body: JSON.stringify(validTask) });
  const id = created.body.data.id;
  const updated = await request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ ...validTask, title: 'Updated assignment', priority: 'Medium' }) });
  assert.equal(updated.response.status, 200); assert.equal(updated.body.data.title, 'Updated assignment');
  const completed = await request(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed' }) });
  assert.equal(completed.body.data.status, 'Completed'); assert.ok(completed.body.data.completedAt);
  const reopened = await request(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Pending' }) });
  assert.equal(reopened.body.data.completedAt, null);
  const deleted = await request(`/api/tasks/${id}`, { method: 'DELETE' }); assert.equal(deleted.response.status, 204); assert.equal(deleted.body, null);
  const missingDelete = await request(`/api/tasks/${id}`, { method: 'DELETE' }); assert.equal(missingDelete.response.status, 404);
}));

test('searches, filters, and sorts tasks', () => withServer(async ({ request }) => {
  const tasks = [
    { ...validTask, title: 'Write project report', category: 'Projects', priority: 'Low', dueDate: null },
    { ...validTask, title: 'Study mathematics', description: 'Prepare for final exam', category: 'Exams', priority: 'High', dueDate: '2026-11-10' },
    { ...validTask, title: 'Submit assignment', priority: 'Medium', dueDate: '2026-11-05' }
  ];
  for (const task of tasks) await request('/api/tasks', { method: 'POST', body: JSON.stringify(task) });
  assert.equal((await request('/api/tasks?search=FINAL')).body.count, 1);
  assert.equal((await request('/api/tasks?category=Projects&priority=Low')).body.count, 1);
  const sorted = await request('/api/tasks?sortBy=dueDate&order=asc');
  assert.deepEqual(sorted.body.data.map((task) => task.dueDate), ['2026-11-05', '2026-11-10', null]);
  assert.equal((await request('/api/tasks?status=Invalid')).response.status, 400);
  const repeated = await request('/api/tasks?search=one&search=two');
  assert.equal(repeated.response.status, 400); assert.equal(repeated.body.error.code, 'INVALID_QUERY');
}));

test('serializes concurrent task updates without reverting status', () => withServer(async ({ request }) => {
  const created = await request('/api/tasks', { method: 'POST', body: JSON.stringify(validTask) });
  const id = created.body.data.id;
  await Promise.all([
    request(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed' }) }),
    request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ ...validTask, title: 'Concurrently updated' }) })
  ]);
  const result = await request(`/api/tasks/${id}`);
  assert.equal(result.body.data.status, 'Completed'); assert.equal(result.body.data.title, 'Concurrently updated'); assert.ok(result.body.data.completedAt);
}));

test('generates correct statistics', () => withServer(async ({ request }) => {
  const overdue = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ ...validTask, dueDate: '2026-11-02' }) });
  const upcoming = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ ...validTask, title: 'Upcoming deadline', dueDate: '2026-11-04' }) });
  await request(`/api/tasks/${upcoming.body.data.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed' }) });
  const stats = await request('/api/stats');
  assert.deepEqual({ total: stats.body.data.totalTasks, completed: stats.body.data.completedTasks, pending: stats.body.data.pendingTasks, overdue: stats.body.data.overdueTasks, percentage: stats.body.data.completionPercentage }, { total: 2, completed: 1, pending: 1, overdue: 1, percentage: 50 });
  assert.ok(overdue.body.data.id);
}));

test('rejects malformed JSON and unsupported methods with correct codes', () => withServer(async ({ request }) => {
  const malformed = await request('/api/tasks', { method: 'POST', body: '{bad' }); assert.equal(malformed.response.status, 400); assert.equal(malformed.body.error.code, 'MALFORMED_JSON');
  const method = await request('/api/tasks', { method: 'PATCH', body: '{}' }); assert.equal(method.response.status, 405); assert.equal(method.response.headers.get('allow'), 'GET, POST');
  const endpoint = await request('/api/missing'); assert.equal(endpoint.response.status, 404);
  const apiMethod = await request('/api', { method: 'POST', body: '{}' }); assert.equal(apiMethod.response.status, 405);
}));

test('rejects oversized request bodies with 413', () => withServer(async ({ request }) => {
  const result = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Large task', description: 'x'.repeat(2000) }) });
  assert.equal(result.response.status, 413); assert.equal(result.body.error.code, 'PAYLOAD_TOO_LARGE');
}, { bodyLimit: '1kb' }));

test('enforces the configured API rate limit', () => withServer(async ({ request }) => {
  assert.equal((await request('/api/health')).response.status, 200);
  assert.equal((await request('/api/health')).response.status, 200);
  const limited = await request('/api/health');
  assert.equal(limited.response.status, 429); assert.equal(limited.body.error.code, 'RATE_LIMIT_EXCEEDED');
}, { rateLimitMax: 2 }));

test('sends basic security headers and does not expose storage', () => withServer(async ({ request }) => {
  const page = await request('/api/health');
  assert.equal(page.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(page.response.headers.get('x-frame-options'), 'DENY');
  const storage = await request('/server/data/tasks.json');
  assert.equal(storage.response.status, 404);
}));

test('preserves data when repository reloads', () => withServer(async ({ request, dataFile }) => {
  await request('/api/tasks', { method: 'POST', body: JSON.stringify(validTask) });
  const repository = await new TaskRepository(dataFile).initialize();
  assert.equal((await repository.all()).length, 1);
}));

test('reports corrupted storage without replacing it', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taskflow-corrupt-')); const dataFile = path.join(directory, 'tasks.json'); await fs.writeFile(dataFile, '{broken');
  await assert.rejects(() => new TaskRepository(dataFile).initialize(), /Unable to load task storage/);
  assert.equal(await fs.readFile(dataFile, 'utf8'), '{broken'); await fs.rm(directory, { recursive: true, force: true });
});

test('reports semantically invalid storage without replacing it', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taskflow-invalid-')); const dataFile = path.join(directory, 'tasks.json'); const content = JSON.stringify([{ id: 'unsafe' }]); await fs.writeFile(dataFile, content);
  await assert.rejects(() => new TaskRepository(dataFile).initialize(), /invalid task record/);
  assert.equal(await fs.readFile(dataFile, 'utf8'), content); await fs.rm(directory, { recursive: true, force: true });
});

test('reports storage write errors without changing in-memory data', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taskflow-storage-')); const dataFile = path.join(directory, 'tasks.json'); const repository = await new TaskRepository(dataFile).initialize();
  repository.writeFile = async () => { throw new Error('simulated write failure'); };
  await assert.rejects(() => repository.create({ id: 'one' }), /simulated write failure/); assert.deepEqual(await repository.all(), []); await fs.rm(directory, { recursive: true, force: true });
});
