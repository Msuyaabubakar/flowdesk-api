import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { requireRole } from '../../middleware/auth';

export const projectRouter = Router();

// GET all projects for this organisation
projectRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const result = await db.query(
      `SELECT p.*,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') AS open_tasks,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done')  AS done_tasks
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.tenant_id = $1 AND p.status != 'archived'
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (e) { next(e) }
});

// GET single project
projectRouter.get('/:id', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const result = await db.query(
      `SELECT * FROM projects WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tenantId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (e) { next(e) }
});

// POST create project (admin only)
projectRouter.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    const body = z.object({
      name:        z.string().min(2),
      description: z.string().optional(),
      startDate:   z.string().optional(),
      endDate:     z.string().optional(),
    }).parse(req.body);

    const result = await db.query(
      `INSERT INTO projects (tenant_id, name, description, start_date, end_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tenantId, body.name, body.description, body.startDate, body.endDate, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e) }
});

// PATCH update project
projectRouter.patch('/:id', requireRole('supervisor'), async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const body = z.object({
      name:        z.string().optional(),
      description: z.string().optional(),
      status:      z.enum(['active','completed','archived']).optional(),
      endDate:     z.string().optional(),
    }).parse(req.body);

    const sets: string[] = ['updated_at = NOW()'];
    const vals: any[]    = [];
    let i = 1;
    if (body.name)        { sets.push(`name = $${i++}`);        vals.push(body.name) }
    if (body.description) { sets.push(`description = $${i++}`); vals.push(body.description) }
    if (body.status)      { sets.push(`status = $${i++}`);      vals.push(body.status) }
    if (body.endDate)     { sets.push(`end_date = $${i++}`);    vals.push(body.endDate) }
    vals.push(req.params.id, tenantId);

    const result = await db.query(
      `UPDATE projects SET ${sets.join(', ')}
       WHERE id = $${i} AND tenant_id = $${i + 1} RETURNING *`,
      vals
    );
    res.json(result.rows[0]);
  } catch (e) { next(e) }
});