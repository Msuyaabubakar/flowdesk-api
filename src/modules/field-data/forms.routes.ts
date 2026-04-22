import { Router } from 'express';
export const formRouter = Router();
formRouter.get('/', (_req, res) => { res.json([]); });