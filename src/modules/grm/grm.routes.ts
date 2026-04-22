import { Router } from 'express';
import { z } from 'zod';
import * as grmService from './grm.service';
import { requireRole } from '../../middleware/auth';

export const grmRouter = Router();

grmRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const q = req.query;
    const result = await grmService.listCases(tenantId, {
      projectId: q.projectId as string,
      status:    q.status    as string,
      priority:  q.priority  as string,
      page:      Number(q.page)  || 1,
      limit:     Number(q.limit) || 20,
    });
    res.json(result);
  } catch (e) { next(e) }
});

grmRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    const body = z.object({
      projectId:        z.string().uuid().optional(),
      title:            z.string().min(2),
      description:      z.string().min(5),
      type:             z.string(),
      priority:         z.enum(['low','medium','high','critical']).default('medium'),
      siteId:           z.string().uuid().optional(),
      complainantName:  z.string().optional(),
      complainantPhone: z.string().optional(),
      complainantAnon:  z.boolean().optional(),
      latitude:         z.number().optional(),
      longitude:        z.number().optional(),
      incidentDate:     z.string().optional(),
    }).parse(req.body);

    const result = await grmService.createCase(tenantId, userId, body);
    res.status(201).json(result);
  } catch (e) { next(e) }
});

grmRouter.patch('/:id/status', requireRole('supervisor'), async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    const { status, note } = z.object({
      status: z.enum(['open','in_review','escalated','resolved','closed']),
      note:   z.string().optional(),
    }).parse(req.body);

    const result = await grmService.updateCaseStatus(
      req.params.id, tenantId, userId, status, note
    );
    res.json(result);
  } catch (e) { next(e) }
});

grmRouter.get('/:id/updates', async (req, res, next) => {
  try {
    const { db } = await import('../../config/db');
    const result = await db.query(
      `SELECT gu.*, u.full_name AS updated_by_name
       FROM grm_updates gu
       LEFT JOIN users u ON u.id = gu.user_id
       WHERE gu.case_id = $1
       ORDER BY gu.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) { next(e) }
});