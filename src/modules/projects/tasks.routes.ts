import { Router } from 'express';
export const taskRouter = Router();
taskRouter.get('/', (_req, res) => { res.json([]); });