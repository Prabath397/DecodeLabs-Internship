import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', details: [] } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof SyntaxError && 'body' in err) err = new AppError(400, 'INVALID_JSON', 'Malformed JSON body');
  if (err.type === 'entity.too.large') err = new AppError(413, 'BODY_TOO_LARGE', 'Request body is too large');
  if (err.code?.startsWith('SQLITE_CONSTRAINT') || [787, 1299, 1555, 1811, 2067, 275].includes(err.errcode)) {
    const message = err.message.includes('products.sku') ? 'A product with this SKU already exists' : err.message.includes('categories.name') ? 'A category with this name already exists' : err.message.includes('FOREIGN KEY') ? 'The referenced record does not exist or is still in use' : 'The request conflicts with stored data';
    err = new AppError(409, 'CONFLICT', message);
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: status === 500 ? 'An unexpected server error occurred' : err.message, details: err.details || [] } });
}
