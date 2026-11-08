const express = require('express');
const path = require('node:path');
const { TaskRepository } = require('./repositories/taskRepository');
const { TaskService } = require('./services/taskService');
const { TaskController } = require('./controllers/taskController');
const { createTaskRouter, asyncRoute, methodNotAllowed } = require('./routes/taskRoutes');
const { createRateLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

async function createApp(config, dependencies = {}) {
  const repository = dependencies.repository || await new TaskRepository(config.dataFile).initialize();
  const service = dependencies.service || new TaskService(repository, dependencies.now);
  const controller = new TaskController(service);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use((request, response, next) => {
    response.set({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
    next();
  });
  app.use('/api', createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }));
  app.use(express.json({ limit: config.bodyLimit, type: 'application/json' }));
  app.get('/api', (request, response) => response.json({ success: true, data: { name: 'TaskFlow API', version: '2.0.0', timezone: 'Asia/Colombo', documentation: '/API.md', endpoints: ['GET /api/health', 'GET /api/tasks', 'GET /api/tasks/:id', 'POST /api/tasks', 'PUT /api/tasks/:id', 'PATCH /api/tasks/:id/status', 'DELETE /api/tasks/:id', 'GET /api/stats'] } }));
  app.all('/api', methodNotAllowed(['GET']));
  app.get('/api/health', (request, response) => response.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } }));
  app.all('/api/health', methodNotAllowed(['GET']));
  app.get('/api/stats', asyncRoute(controller.stats));
  app.all('/api/stats', methodNotAllowed(['GET']));
  app.use('/api/tasks', createTaskRouter(controller));
  app.use('/css', express.static(path.join(config.publicDirectory, 'css'), { dotfiles: 'ignore' }));
  app.use('/js', express.static(path.join(config.publicDirectory, 'js'), { dotfiles: 'ignore' }));
  app.get('/', (request, response) => response.sendFile(path.join(config.publicDirectory, 'index.html')));
  app.get('/API.md', (request, response) => response.sendFile(path.join(config.publicDirectory, 'API.md')));
  app.use(notFound);
  app.use(errorHandler);
  return { app, repository, service };
}

module.exports = { createApp };
