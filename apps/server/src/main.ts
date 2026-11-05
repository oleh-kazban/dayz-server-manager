import { buildApp } from './app/app';
import { loadEnv } from './config/env';

async function bootstrap() {
  const config = loadEnv();
  const app = buildApp({ config });

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      await app.close();
      app.closeDb();
      app.log.info('Server and database closed cleanly.');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error while closing server.');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    const address = await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`DayZ Server Manager daemon running on ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void bootstrap();
