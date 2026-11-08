const fs = require('node:fs/promises');
const path = require('node:path');

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isStoredTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;
  const keys = ['id', 'title', 'description', 'category', 'priority', 'status', 'dueDate', 'createdAt', 'updatedAt', 'completedAt'];
  if (Object.keys(task).some((key) => !keys.includes(key)) || keys.some((key) => !Object.hasOwn(task, key))) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(task.id)) return false;
  if (typeof task.title !== 'string' || task.title.length < 3 || task.title.length > 120 || typeof task.description !== 'string' || task.description.length > 1000) return false;
  if (!['Assignments', 'Projects', 'Exams', 'Personal', 'Other'].includes(task.category)) return false;
  if (!['Low', 'Medium', 'High'].includes(task.priority) || !['Pending', 'Completed'].includes(task.status)) return false;
  if (task.dueDate !== null && (typeof task.dueDate !== 'string' || !isCalendarDate(task.dueDate))) return false;
  if (!Number.isFinite(Date.parse(task.createdAt)) || !Number.isFinite(Date.parse(task.updatedAt))) return false;
  if (task.completedAt !== null && !Number.isFinite(Date.parse(task.completedAt))) return false;
  return true;
}

class TaskRepository {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.tasks = [];
    this.writeQueue = Promise.resolve();
    this.initialized = false;
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error('Storage root must be a JSON array');
      if (!parsed.every(isStoredTask)) throw new Error('Storage contains an invalid task record');
      this.tasks = parsed;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Unable to load task storage: ${error.message}`);
      await this.writeFile([]);
    }
    this.initialized = true;
    return this;
  }

  ensureInitialized() {
    if (!this.initialized) throw new Error('Task repository is not initialized');
  }

  async all() {
    this.ensureInitialized();
    return structuredClone(this.tasks);
  }

  async findById(id) {
    this.ensureInitialized();
    const task = this.tasks.find((item) => item.id === id);
    return task ? structuredClone(task) : null;
  }

  async create(task) {
    return this.mutate((tasks) => tasks.push(task), task);
  }

  async update(id, updater) {
    this.ensureInitialized();
    const pending = this.writeQueue.then(async () => {
      const tasks = structuredClone(this.tasks);
      const index = tasks.findIndex((item) => item.id === id);
      if (index < 0) return false;
      const updatedTask = typeof updater === 'function' ? updater(structuredClone(tasks[index])) : updater;
      tasks[index] = updatedTask;
      await this.writeFile(tasks);
      this.tasks = tasks;
      return structuredClone(updatedTask);
    });
    this.writeQueue = pending.catch(() => {});
    return pending;
  }

  async delete(id) {
    return this.mutate((tasks) => {
      const index = tasks.findIndex((item) => item.id === id);
      if (index < 0) return false;
      tasks.splice(index, 1);
      return true;
    });
  }

  async mutate(operation, result) {
    this.ensureInitialized();
    const pending = this.writeQueue.then(async () => {
      const next = structuredClone(this.tasks);
      const operationResult = operation(next);
      if (operationResult === false) return false;
      await this.writeFile(next);
      this.tasks = next;
      return result === undefined ? operationResult : structuredClone(result);
    });
    this.writeQueue = pending.catch(() => {});
    return pending;
  }

  async writeFile(tasks) {
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(tasks, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => {});
      throw new Error(`Unable to persist task storage: ${error.message}`);
    }
  }
}

module.exports = { TaskRepository };
