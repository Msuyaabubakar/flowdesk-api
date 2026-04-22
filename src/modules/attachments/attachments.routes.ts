import { Router } from 'express';
export const attachRouter = Router();
attachRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  res.json([]);
});