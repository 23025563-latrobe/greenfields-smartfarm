import express from 'express';

const app = express();
const port = 3001;

app.use(express.json());

app.get('/api/health', (request, response) => {
  response.json({
    status: 'ok',
    service: 'GreenFields SmartFarm API'
  });
});

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.use((error, request, response, next) => {
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'Invalid JSON request body' });
  }

  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`GreenFields SmartFarm API: http://localhost:${port}`);
});
