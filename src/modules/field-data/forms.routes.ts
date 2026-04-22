 ── src/modules/field-data/forms.routes.ts ────────────────────
import { Router, type Request, type Response } from 'express';

export const formRouter = Router();

formRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  res.json([]);
});