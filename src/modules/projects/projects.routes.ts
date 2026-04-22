import { Router } from 'express';
export const projectRouter = Router();
projectRouter.get('/', (_req, res) => { res.json([]); });