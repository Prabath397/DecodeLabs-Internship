const { AppError } = require('../errors');

const CATEGORIES = ['Assignments', 'Projects', 'Exams', 'Personal', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Pending', 'Completed'];
const WRITABLE_FIELDS = ['title', 'description', 'category', 'priority', 'status', 'dueDate'];

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateTask(input, { partial = false, statusOnly = false } = {}) {
  const details = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid task data', [{ field: 'body', message: 'Request body must be a JSON object' }]);
  }
  const allowed = statusOnly ? ['status'] : WRITABLE_FIELDS;
  for (const field of Object.keys(input)) {
    if (!allowed.includes(field)) details.push({ field, message: 'Field is unknown or cannot be changed' });
  }
  if (statusOnly && !Object.hasOwn(input, 'status')) details.push({ field: 'status', message: 'Status is required' });
  if (!partial && !statusOnly && !Object.hasOwn(input, 'title')) details.push({ field: 'title', message: 'Title is required' });
  if (Object.hasOwn(input, 'title')) {
    if (typeof input.title !== 'string') details.push({ field: 'title', message: 'Title must be a string' });
    else if (input.title.trim().length < 3) details.push({ field: 'title', message: 'Title must contain at least 3 characters' });
    else if (input.title.trim().length > 120) details.push({ field: 'title', message: 'Title must not exceed 120 characters' });
  }
  if (Object.hasOwn(input, 'description') && typeof input.description !== 'string') details.push({ field: 'description', message: 'Description must be a string' });
  else if (input.description?.length > 1000) details.push({ field: 'description', message: 'Description must not exceed 1000 characters' });
  if (Object.hasOwn(input, 'category') && !CATEGORIES.includes(input.category)) details.push({ field: 'category', message: `Category must be one of: ${CATEGORIES.join(', ')}` });
  if (Object.hasOwn(input, 'priority') && !PRIORITIES.includes(input.priority)) details.push({ field: 'priority', message: `Priority must be one of: ${PRIORITIES.join(', ')}` });
  if (Object.hasOwn(input, 'status') && !STATUSES.includes(input.status)) details.push({ field: 'status', message: `Status must be one of: ${STATUSES.join(', ')}` });
  if (Object.hasOwn(input, 'dueDate') && input.dueDate !== null && (typeof input.dueDate !== 'string' || !isValidDate(input.dueDate))) details.push({ field: 'dueDate', message: 'Due date must be a valid calendar date in YYYY-MM-DD format or null' });
  if (details.length) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid task data', details);
  const clean = {};
  for (const field of allowed) {
    if (Object.hasOwn(input, field)) clean[field] = typeof input[field] === 'string' ? input[field].trim() : input[field];
  }
  return clean;
}

function validateQuery(query) {
  const allowed = ['status', 'priority', 'category', 'search', 'sortBy', 'order'];
  const details = [];
  for (const key of Object.keys(query)) if (!allowed.includes(key)) details.push({ field: key, message: 'Unsupported query parameter' });
  for (const key of allowed) {
    if (Object.hasOwn(query, key) && typeof query[key] !== 'string') details.push({ field: key, message: 'Query parameter must be provided once as a string' });
  }
  if (typeof query.search === 'string' && query.search.length > 200) details.push({ field: 'search', message: 'Search must not exceed 200 characters' });
  if (query.status && !STATUSES.includes(query.status)) details.push({ field: 'status', message: 'Invalid status filter' });
  if (query.priority && !PRIORITIES.includes(query.priority)) details.push({ field: 'priority', message: 'Invalid priority filter' });
  if (query.category && !CATEGORIES.includes(query.category)) details.push({ field: 'category', message: 'Invalid category filter' });
  if (query.sortBy && !['dueDate', 'createdAt', 'priority', 'title'].includes(query.sortBy)) details.push({ field: 'sortBy', message: 'sortBy must be dueDate, createdAt, priority, or title' });
  if (query.order && !['asc', 'desc'].includes(query.order)) details.push({ field: 'order', message: 'order must be asc or desc' });
  if (details.length) throw new AppError(400, 'INVALID_QUERY', 'Invalid query parameters', details);
  return query;
}

module.exports = { CATEGORIES, PRIORITIES, STATUSES, validateTask, validateQuery };
