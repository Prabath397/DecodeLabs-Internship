const { randomUUID } = require('node:crypto');
const { AppError } = require('../errors');

class TaskService {
  constructor(repository, now = () => new Date()) {
    this.repository = repository;
    this.now = now;
  }

  async list(query = {}) {
    let tasks = await this.repository.all();
    for (const field of ['status', 'priority', 'category']) if (query[field]) tasks = tasks.filter((task) => task[field] === query[field]);
    if (query.search) {
      const search = query.search.toLowerCase();
      tasks = tasks.filter((task) => task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search));
    }
    if (query.sortBy) {
      const direction = query.order === 'desc' ? -1 : 1;
      const priority = { Low: 1, Medium: 2, High: 3 };
      tasks.sort((a, b) => {
        if (query.sortBy === 'dueDate' && (a.dueDate === null || b.dueDate === null)) {
          if (a.dueDate === b.dueDate) return 0;
          return a.dueDate === null ? 1 : -1;
        }
        const left = query.sortBy === 'priority' ? priority[a.priority] : a[query.sortBy];
        const right = query.sortBy === 'priority' ? priority[b.priority] : b[query.sortBy];
        return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' }) * direction;
      });
    }
    return tasks;
  }

  async get(id) {
    const task = await this.repository.findById(id);
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    return task;
  }

  async create(input) {
    const timestamp = this.now().toISOString();
    const status = input.status || 'Pending';
    const task = { id: randomUUID(), title: input.title, description: input.description || '', category: input.category || 'Other', priority: input.priority || 'Medium', status, dueDate: input.dueDate || null, createdAt: timestamp, updatedAt: timestamp, completedAt: status === 'Completed' ? timestamp : null };
    return this.repository.create(task);
  }

  async update(id, input) {
    const task = await this.repository.update(id, (current) => {
      const timestamp = this.now().toISOString();
      const status = input.status || current.status;
      const completedAt = status === 'Completed' ? (current.status === 'Completed' ? current.completedAt : timestamp) : null;
      return { ...current, ...input, id: current.id, createdAt: current.createdAt, updatedAt: timestamp, completedAt };
    });
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    return task;
  }

  async delete(id) {
    if (!await this.repository.delete(id)) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  async stats() {
    const tasks = await this.repository.all();
    const today = this.localDate(this.now());
    const completed = tasks.filter((task) => task.status === 'Completed').length;
    const pendingTasks = tasks.filter((task) => task.status === 'Pending');
    const upcomingDeadlines = pendingTasks.filter((task) => task.dueDate && task.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
    return { totalTasks: tasks.length, completedTasks: completed, pendingTasks: pendingTasks.length, overdueTasks: pendingTasks.filter((task) => task.dueDate && task.dueDate < today).length, completionPercentage: tasks.length ? Math.round((completed / tasks.length) * 100) : 0, upcomingDeadlines };
  }

  localDate(date) {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
}

module.exports = { TaskService };
