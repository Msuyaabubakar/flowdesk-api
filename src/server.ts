import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Pool } from 'pg';

require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT  = process.env.JWT_SECRET || 'flowdesksecret2026';

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── DATABASE ─────────────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10
});

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────
const auth = (req: any, res: any, next: any) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(h.slice(7), JWT);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── HEALTH ───────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', ts: new Date().toISOString() });
});

// ── TEST DB ──────────────────────────────────────────────────────
app.get('/api/test-db', async (_req, res) => {
  try {
    const r = await db.query('SELECT COUNT(*) as count FROM users');
    res.json({ connected: true, userCount: r.rows[0].count });
  } catch (e: any) {
    res.json({ connected: false, error: e.message });
  }
});

// ── REGISTER ─────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { tenantName, fullName, email, password } = req.body;
    if (!tenantName || !fullName || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const slug = tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const tRes = await db.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
      [tenantName, slug]
    );
    const tenantId = tRes.rows[0].id;
    const hash     = await bcrypt.hash(password, 10);
    const uRes     = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4,'admin') RETURNING id, email, full_name, role`,
      [tenantId, email, hash, fullName]
    );
    const u = uRes.rows[0];
    res.status(201).json({
      message: 'Account created successfully',
      user: { id: u.id, email: u.email, fullName: u.full_name, role: u.role, tenantId }
    });
  } catch (e: any) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already registered. Please log in.' });
    res.status(500).json({ error: e.message });
  }
});

// ── LOGIN ────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const result = await db.query(
      `SELECT u.*, t.name as tenant_name
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email]
    );

    const u = result.rows[0];
    if (!u) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, u.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const accessToken = jwt.sign(
      { userId: u.id, tenantId: u.tenant_id, role: u.role, email: u.email },
      JWT,
      { expiresIn: '7d' }
    );

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [u.id]);

    res.json({
      accessToken,
      user: {
        id:       u.id,
        email:    u.email,
        fullName: u.full_name,
        role:     u.role,
        tenantId: u.tenant_id
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GRM ──────────────────────────────────────────────────────────
app.get('/api/grm', auth, async (req: any, res) => {
  try {
    const { tenantId } = req.user;
    const { status, priority, limit = 100 } = req.query;
    let q = `SELECT g.*,
               u1.full_name AS logged_by_name,
               u2.full_name AS assigned_to_name,
               (SELECT COUNT(*) FROM attachments a WHERE a.entity_type='grm_case' AND a.entity_id=g.id AND a.file_type LIKE 'image/%') AS photo_count
             FROM grm_cases g
             LEFT JOIN users u1 ON u1.id = g.logged_by
             LEFT JOIN users u2 ON u2.id = g.assigned_to
             WHERE g.tenant_id = $1`;
    const params: any[] = [tenantId];
    let i = 2;
    if (status)   { q += ` AND g.status = $${i++}`;   params.push(status); }
    if (priority) { q += ` AND g.priority = $${i++}`; params.push(priority); }
    q += ` ORDER BY g.created_at DESC LIMIT $${i}`;
    params.push(Number(limit));
    const r = await db.query(q, params);
    res.json({ cases: r.rows, total: r.rowCount });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/grm', auth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { title, description, type, priority = 'medium',
            complainantName, complainantPhone, latitude, longitude, incidentDate } = req.body;
    if (!title || !description || !type)
      return res.status(400).json({ error: 'title, description and type are required' });

    const countRes = await db.query(
      'SELECT COUNT(*) + 1 AS n FROM grm_cases WHERE tenant_id = $1', [tenantId]
    );
    const reference = `GRM-${String(countRes.rows[0].n).padStart(4, '0')}`;
    const slaDays: Record<string, number> = { critical: 1, high: 2, medium: 5, low: 14 };
    const sla = new Date();
    sla.setDate(sla.getDate() + (slaDays[priority] ?? 5));

    const r = await db.query(
      `INSERT INTO grm_cases
         (tenant_id, reference, title, description, type, priority,
          complainant_name, complainant_phone, latitude, longitude,
          logged_by, sla_deadline, incident_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [tenantId, reference, title, description, type, priority,
       complainantName || null, complainantPhone || null,
       latitude || null, longitude || null,
       userId, sla, incidentDate || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/grm/:id/status', auth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { status, note } = req.body;
    const r = await db.query(
      `UPDATE grm_cases SET status=$1,
        resolved_by=CASE WHEN $1='resolved' THEN $2 ELSE resolved_by END,
        resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE resolved_at END,
        updated_at=NOW()
       WHERE id=$3 AND tenant_id=$4 RETURNING *`,
      [status, userId, req.params.id, tenantId]
    );
    if (note) {
      await db.query(
        'INSERT INTO grm_updates (case_id, user_id, action, note, to_status) VALUES ($1,$2,$3,$4,$5)',
        [req.params.id, userId, 'status_changed', note, status]
      );
    }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── SUBMISSIONS ───────────────────────────────────────────────────
app.get('/api/submissions', auth, async (req: any, res) => {
  try {
    const { tenantId } = req.user;
    const r = await db.query(
      `SELECT fs.*, u.full_name AS agent_name
       FROM form_submissions fs
       LEFT JOIN users u ON u.id = fs.submitted_by
       WHERE fs.tenant_id = $1
       ORDER BY fs.submitted_at DESC LIMIT 100`,
      [tenantId]
    );
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/submissions', auth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { data, latitude, longitude, offlineId } = req.body;

    // Check duplicate
    if (offlineId) {
      const exists = await db.query('SELECT id FROM form_submissions WHERE offline_id=$1', [offlineId]);
      if (exists.rows[0]) return res.json({ id: exists.rows[0].id, duplicate: true });
    }

    // Use first project if exists, else null
    let projectId = null;
    try {
      const pRes = await db.query('SELECT id FROM projects WHERE tenant_id=$1 LIMIT 1', [tenantId]);
      if (pRes.rows[0]) projectId = pRes.rows[0].id;
    } catch {}

    const r = await db.query(
      `INSERT INTO form_submissions
         (tenant_id, project_id, submitted_by, data, latitude, longitude, synced_at, offline_id)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7) RETURNING id`,
      [tenantId, projectId, userId, JSON.stringify(data), latitude || null, longitude || null, offlineId || null]
    );
    res.status(201).json({ id: r.rows[0].id, duplicate: false });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PROJECTS ──────────────────────────────────────────────────────
app.get('/api/projects', auth, async (req: any, res) => {
  try {
    const { tenantId } = req.user;
    const r = await db.query(
      `SELECT p.*,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') AS open_tasks
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.tenant_id = $1 AND p.status != 'archived'
       GROUP BY p.id ORDER BY p.created_at DESC`,
      [tenantId]
    );
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects', auth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { name, description, startDate, endDate } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });
    const r = await db.query(
      'INSERT INTO projects (tenant_id, name, description, start_date, end_date, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [tenantId, name, description || null, startDate || null, endDate || null, userId]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── TASKS ─────────────────────────────────────────────────────────
app.get('/api/tasks/project/:projectId', auth, async (req: any, res) => {
  try {
    const { tenantId } = req.user;
    const r = await db.query(
      `SELECT t.*, u.full_name AS assigned_to_name FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id=$1 AND t.tenant_id=$2 ORDER BY t.created_at DESC`,
      [req.params.projectId, tenantId]
    );
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', auth, async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { projectId, title, description, priority = 'medium', tag, assignedTo, dueDate } = req.body;
    if (!projectId || !title) return res.status(400).json({ error: 'projectId and title required' });
    const r = await db.query(
      'INSERT INTO tasks (project_id, tenant_id, title, description, priority, tag, assigned_to, created_by, due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [projectId, tenantId, title, description || null, priority, tag || null, assignedTo || null, userId, dueDate || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/tasks/:id', auth, async (req: any, res) => {
  try {
    const { tenantId } = req.user;
    const { status } = req.body;
    const r = await db.query(
      `UPDATE tasks SET status=$1, updated_at=NOW(),
        completed_at=CASE WHEN $1='done' THEN NOW() ELSE completed_at END
       WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [status, req.params.id, tenantId]
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────
app.get('/api/notifications', auth, async (req: any, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── ERROR HANDLER ─────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ── START ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 FlowDesk API running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'NOT SET'}`);
});
