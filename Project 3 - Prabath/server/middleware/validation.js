import { AppError } from '../utils/errors.js';

export function validate(body, schema, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'VALIDATION_ERROR', 'A JSON object is required');
  const unknown = Object.keys(body).filter((key) => !schema[key]);
  const details = unknown.map((field) => ({ field, message: 'Unknown field' }));
  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    if (value === undefined) {
      if (rules.required && !partial) details.push({ field, message: 'Required' });
      continue;
    }
    if (rules.nullable && value === null) continue;
    if (rules.type === 'string' && (typeof value !== 'string' || (rules.min && value.trim().length < rules.min) || (rules.max && value.length > rules.max))) details.push({ field, message: `Must be a string${rules.max ? ` up to ${rules.max} characters` : ''}` });
    if (rules.type === 'integer' && (!Number.isSafeInteger(value) || value < (rules.min ?? Number.MIN_SAFE_INTEGER))) details.push({ field, message: `Must be an integer of at least ${rules.min ?? Number.MIN_SAFE_INTEGER}` });
    if (rules.values && !rules.values.includes(value)) details.push({ field, message: `Must be one of: ${rules.values.join(', ')}` });
    if (rules.email && value !== '' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) details.push({ field, message: 'Must be a valid email address' });
  }
  if (details.length) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', details);
  return body;
}

export function idParam(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid resource id');
  return id;
}
