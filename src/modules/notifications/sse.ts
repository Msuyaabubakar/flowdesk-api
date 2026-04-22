declare module 'express';

import { RequestHandler } from 'express';
export const sseHandler: RequestHandler = (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();
};