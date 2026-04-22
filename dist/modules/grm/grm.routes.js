"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grmRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
exports.grmRouter = (0, express_1.Router)();
// GET all GRM cases
exports.grmRouter.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await db_1.db.query(`SELECT * FROM grm_cases WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
        res.json({ cases: result.rows, total: result.rowCount });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// POST create GRM case
exports.grmRouter.post('/', async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { title, description, type, priority = 'medium' } = req.body;
        if (!title || !description || !type) {
            return res.status(400).json({ error: 'title, description and type are required' });
        }
        const countRes = await db_1.db.query(`SELECT COUNT(*) + 1 AS n FROM grm_cases WHERE tenant_id = $1`, [tenantId]);
        const reference = `GRM-${String(countRes.rows[0].n).padStart(4, '0')}`;
        const slaDays = { critical: 1, high: 2, medium: 5, low: 14 };
        const sla = new Date();
        sla.setDate(sla.getDate() + (slaDays[priority] ?? 5));
        const result = await db_1.db.query(`INSERT INTO grm_cases
         (tenant_id, reference, title, description, type, priority, logged_by, sla_deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [tenantId, reference, title, description, type, priority, userId, sla]);
        res.status(201).json(result.rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// PATCH update case status
exports.grmRouter.patch('/:id/status', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { status } = req.body;
        const result = await db_1.db.query(`UPDATE grm_cases SET status = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING *`, [status, req.params.id, tenantId]);
        res.json(result.rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
