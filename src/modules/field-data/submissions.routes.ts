import { Router } from 'express';
export const subRouter = Router();
subRouter.get('/', async (_req, res) => { res.json([]); });