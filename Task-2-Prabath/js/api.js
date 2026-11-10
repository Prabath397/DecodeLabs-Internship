class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const api = {
  async request(path, options = {}) {
    let response;
    try {
      response = await fetch(path, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
    } catch {
      throw new ApiError('The TaskFlow server is unavailable. Start the server and try again.', 0);
    }
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(payload?.error?.message || 'The request failed', response.status, payload?.error?.details || []);
    return payload;
  },
  listTasks(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
    return this.request(`/api/tasks?${params}`);
  },
  createTask(task) { return this.request('/api/tasks', { method: 'POST', body: JSON.stringify(task) }); },
  updateTask(id, task) { return this.request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(task) }); },
  updateStatus(id, status) { return this.request(`/api/tasks/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
  deleteTask(id) { return this.request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  getStats() { return this.request('/api/stats'); }
};

window.taskApi = api;
