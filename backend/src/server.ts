import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Mount API router
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>SAHELI Backend Engine</title></head>
      <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc;">
        <h1 style="color: #f43f5e;">SAHELI — Safe Routes Engine API</h1>
        <p>Backend routing score engine, live journey monitor, and crowdsourced safety services are active.</p>
        <ul>
          <li><strong>Health:</strong> <a href="/api/health" style="color: #38bdf8;">/api/health</a></li>
          <li><strong>Heatmap:</strong> <a href="/api/incidents/heatmap" style="color: #38bdf8;">/api/incidents/heatmap</a></li>
        </ul>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`[SAHELI API] Server running on http://localhost:${PORT}`);
});
