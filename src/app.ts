import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { authRouter }    from './modules/auth/auth.routes';
import { projectRouter } from './modules/projects/projects.routes';
import { taskRouter }    from './modules/projects/tasks.routes';
import { formRouter }    from './modules/field-data/forms.routes';
import { subRouter }     from './modules/field-data/submissions.routes';
import { grmRouter }     from './modules/grm/grm.routes';
import { attachRouter }  from './modules/attachments/attachments.routes';
import { notifRouter }   from './modules/notifications/notifications.routes';
import { sseHandler }    from './modules/notifications/sse';
import { authenticate }  from './middleware/auth';

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api',      rateLimit({ windowMs: 60 * 1000, max: 300 }));

// Public routes (no login needed)
app.use('/api/auth', authRouter);

// All routes below this line require login
app.use('/api', authenticate);
app.use('/api/projects',      projectRouter);
app.use('/api/tasks',         taskRouter);
app.use('/api/forms',         formRouter);
app.use('/api/submissions',   subRouter);
app.use('/api/grm',           grmRouter);
app.use('/api/attachments',   attachRouter);
app.use('/api/notifications', notifRouter);
app.get('/api/live',          sseHandler);

// Health check — open this in browser to test
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: '1.0.0', ts: new Date().toISOString() })
);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err?.stack || err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

export default app;