"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json());
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0', ts: new Date().toISOString() });
});
// Auth routes
app.post('/api/auth/register', async (req, res) => {
    res.json({ message: 'register endpoint working', body: req.body });
});
app.post('/api/auth/login', async (req, res) => {
    res.json({ message: 'login endpoint working', body: req.body });
});
// Project routes
app.get('/api/projects', (_req, res) => {
    res.json({ message: 'projects endpoint working', projects: [] });
});
// GRM routes
app.get('/api/grm', (_req, res) => {
    res.json({ message: 'grm endpoint working', cases: [] });
});
app.post('/api/grm', (req, res) => {
    res.json({ message: 'grm case created', body: req.body });
});
// Field data routes
app.get('/api/forms', (_req, res) => {
    res.json({ message: 'forms endpoint working', forms: [] });
});
app.post('/api/submissions', (req, res) => {
    res.json({ message: 'submission received', body: req.body });
});
// Tasks routes
app.get('/api/tasks', (_req, res) => {
    res.json({ message: 'tasks endpoint working', tasks: [] });
});
// Notifications
app.get('/api/notifications', (_req, res) => {
    res.json({ message: 'notifications working', notifications: [] });
});
// Attachments
app.get('/api/attachments', (_req, res) => {
    res.json({ message: 'attachments working' });
});
// 404
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('✅ FlowDesk API is running!');
    console.log(`🚀 Open this in your browser: http://localhost:${PORT}/health`);
    console.log('');
});
