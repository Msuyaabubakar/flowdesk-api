import { Router } from 'express';
export const projectRouter = Router();

projectRouter.get('/', async (req, res) => {
  res.json({ message: 'projects route working' });
});