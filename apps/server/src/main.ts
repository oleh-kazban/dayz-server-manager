import { buildApp } from './app/app';
import { loadEnv } from './config/env';
import { defaultDataDir } from './services/identity/setup-file';
import { prepareIdentity } from './services/identity/startup';

async function bootstrap() {
  const config = loadEnv();
  const app = buildApp({ config });

  try {
    prepareIdentity({
      db: app.db,
      sqlite: app.sqlite,
      dataDir: defaultDataDir(),
      log: app.log,
    });
  } catch (err) {
    app.log.error(err, 'Could not prepare the first-time setup account.');
    process.exit(1);
  }

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
