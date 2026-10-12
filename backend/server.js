import { createApp } from './app.js';
import { openDatabase } from './db.js';

const database = openDatabase();
const app = createApp(database);
const port = 3001;

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
