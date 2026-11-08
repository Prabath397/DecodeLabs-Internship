class TaskController {
  constructor(service) {
    this.service = service;
  }

  list = async (request, response) => {
    const tasks = await this.service.list(request.validatedQuery);
    response.json({ success: true, data: tasks, count: tasks.length });
  };

  get = async (request, response) => response.json({ success: true, data: await this.service.get(request.params.id) });

  create = async (request, response) => response.status(201).json({ success: true, message: 'Task created successfully', data: await this.service.create(request.validatedBody) });

  update = async (request, response) => response.json({ success: true, message: 'Task updated successfully', data: await this.service.update(request.params.id, request.validatedBody) });

  status = async (request, response) => response.json({ success: true, message: 'Task status updated successfully', data: await this.service.update(request.params.id, request.validatedBody) });

  delete = async (request, response) => {
    await this.service.delete(request.params.id);
    response.status(204).end();
  };

  stats = async (request, response) => response.json({ success: true, data: await this.service.stats() });
}

module.exports = { TaskController };
