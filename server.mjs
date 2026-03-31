import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

const distPath = path.join(__dirname, 'dist');

app.disable('x-powered-by');
app.use(express.static(distPath, { maxAge: '1h', etag: true, index: false }));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on ${PORT}`);
});

