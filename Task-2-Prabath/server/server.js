const { createConfig } = require('./config');
const { createApp } = require('./app');

async function start() {
  const config = createConfig();
  const { app } = await createApp(config);
  const server = app.listen(config.port, config.host, () => console.log(`TaskFlow is running at http://${config.host}:${config.port}`));
  const shutdown = (signal) => {
    console.log(`${signal} received; closing server`);
    server.close((error) => process.exit(error ? 1 : 0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error(`Unable to start TaskFlow: ${error.message}`);
  process.exit(1);
});
