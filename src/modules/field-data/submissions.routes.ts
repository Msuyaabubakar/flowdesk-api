import { Router } from 'express';
export const subRouter = Router();
subRouter.get('/', (_req, res) => { res.json([]); });