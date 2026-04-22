"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseHandler = void 0;
const sseHandler = (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
};
exports.sseHandler = sseHandler;
