const { AppError } = require('../errors');

function notFound(request, response) {
  response.status(404).json({ success: false, error: { code: 'ENDPOINT_NOT_FOUND', message: 'Endpoint not found' } });
}

function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);
  if (error.type === 'entity.too.large') return response.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the configured size limit' } });
  if (error instanceof SyntaxError && error.status === 400 && Object.hasOwn(error, 'body')) return response.status(400).json({ success: false, error: { code: 'MALFORMED_JSON', message: 'Request body contains malformed JSON' } });
  if (error instanceof AppError) {
    const body = { success: false, error: { code: error.code, message: error.message } };
    if (error.details) body.error.details = error.details;
    return response.status(error.status).json(body);
  }
  console.error(error);
  return response.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred' } });
}

module.exports = { notFound, errorHandler };
