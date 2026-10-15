import { createApp } from './app.js';
import { openDatabase } from './db.js';

const database = openDatabase();
const app = createApp(database);
const port = Number(process.env.PORT ?? 3101);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const server = app.listen(port, () => {
  console.log(`GreenFields SmartFarm API: http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
