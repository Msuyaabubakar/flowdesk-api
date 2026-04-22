import { Router } from 'express';
export const notifRouter = Router();
notifRouter.get('/', (_req, res) => { res.json([]); });