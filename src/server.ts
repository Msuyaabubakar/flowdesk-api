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

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM users');
    res.json({ connected: true, userCount: result.rows[0].count });
  } catch(e) {
    res.json({ connected: false, error: e.message });
  }
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { tenantName, fullName, email, password } = req.body;
    if (!tenantName || !fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const slug = tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const tenantRes = await db.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
      [tenantName, slug]
    );
    const tenantId = tenantRes.rows[0].id;
    const hash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      'INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role',
      [tenantId, email, hash, fullName, 'admin']
    );
    const user = userRes.rows[0];
    res.status(201).json({ message: 'Account created', user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch(e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await db.query(
      'SELECT u.*, t.name as tenant_name FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = $1 AND u.is_active = TRUE',
      [email]
    );
    const dbUser = result.rows[0];
    if (!dbUser) return res.status(401).json({ error: 'Invalid email or password' });
    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });
    const payload = { userId: dbUser.id, tenantId: dbUser.tenant_id, role: dbUser.role, email: dbUser.email };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'flowdesksecret2026', { expiresIn: '7d' });
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [dbUser.id]);
    res.json({
      accessToken,
      user: { id: dbUser.id, email: dbUser.email, fullName: dbUser.full_name, role: dbUser.role, tenantId: dbUser.tenant_id }
    });
  } catch(e) {
    console.error('Login error:', e);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
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