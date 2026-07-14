"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_1 = require("./routes/api");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Mount API router
app.use('/api', api_1.apiRouter);
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
