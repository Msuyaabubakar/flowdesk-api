import { Router } from 'express';
export const attachRouter = Router();
attachRouter.get('/', (_req, res) => { res.json([]); });