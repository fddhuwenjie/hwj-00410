import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, seedData, checkTimeout } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDatabase();
seedData();
checkTimeout();

import authRoutes from './routes/auth';
import orderRoutes from './routes/orders';
import staffRoutes from './routes/staff';
import announcementRoutes from './routes/announcements';
import statsRoutes from './routes/stats';
import notificationRoutes from './routes/notifications';
import buildingRoutes from './routes/buildings';
import inspectionRoutes from './routes/inspections';
import materialRoutes from './routes/materials';
import knowledgeRoutes from './routes/knowledge';
import billRoutes from './routes/bills';
import returnVisitRoutes from './routes/returnVisits';

setInterval(() => {
  checkTimeout();
}, 60 * 60 * 1000);

const app = express();
const PORT = 8410;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/return-visits', returnVisitRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
  console.log(`📊 前端服务端口: 3410`);
  console.log(`🔌 API前缀: /api`);
});
