import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', ts: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  res.json({ message: 'register endpoint working', body: req.body });
});

app.post('/api/auth/login', async (req, res) => {
  res.json({ message: 'login endpoint working', body: req.body });
});

// Project routes
app.get('/api/projects', (_req, res) => {
  res.json({ message: 'projects endpoint working', projects: [] });
});

// GRM routes
app.get('/api/grm', (_req, res) => {
  res.json({ message: 'grm endpoint working', cases: [] });
});

app.post('/api/grm', (req, res) => {
  res.json({ message: 'grm case created', body: req.body });
});

// Field data routes
app.get('/api/forms', (_req, res) => {
  res.json({ message: 'forms endpoint working', forms: [] });
});

app.post('/api/submissions', (req, res) => {
  res.json({ message: 'submission received', body: req.body });
});

// Tasks routes
app.get('/api/tasks', (_req, res) => {
  res.json({ message: 'tasks endpoint working', tasks: [] });
});

// Notifications
app.get('/api/notifications', (_req, res) => {
  res.json({ message: 'notifications working', notifications: [] });
});

// Attachments
app.get('/api/attachments', (_req, res) => {
  res.json({ message: 'attachments working' });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('✅ FlowDesk API is running!');
  console.log(`🚀 Open this in your browser: http://localhost:${PORT}/health`);
  console.log('');
});