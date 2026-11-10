const express = require('express');
const { validateTask, validateQuery } = require('../middleware/validation');

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function validateBody(options) {
  return (request, response, next) => {
    try {
      request.validatedBody = validateTask(request.body, options);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function methodNotAllowed(allowed) {
  return (request, response) => {
    response.set('Allow', allowed.join(', '));
    response.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed for this endpoint' } });
  };
}

function validateId(request, response, next) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)) {
    return response.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task identifier must be a valid UUID' } });
  }
  next();
}

function createTaskRouter(controller) {
  const router = express.Router();
  router.route('/').get((request, response, next) => {
    try { request.validatedQuery = validateQuery(request.query); next(); } catch (error) { next(error); }
  }, asyncRoute(controller.list)).post(validateBody(), asyncRoute(controller.create)).all(methodNotAllowed(['GET', 'POST']));
  router.use('/:id', validateId);
  router.route('/:id/status').patch(validateBody({ statusOnly: true }), asyncRoute(controller.status)).all(methodNotAllowed(['PATCH']));
  router.route('/:id').get(asyncRoute(controller.get)).put(validateBody(), asyncRoute(controller.update)).delete(asyncRoute(controller.delete)).all(methodNotAllowed(['GET', 'PUT', 'DELETE']));
  return router;
}

module.exports = { createTaskRouter, asyncRoute, methodNotAllowed };
