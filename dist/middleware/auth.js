"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(header.slice(7), process.env.JWT_SECRET || 'devsecret');
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
const requireRole = (min) => (req, res, next) => {
    const rank = { admin: 3, supervisor: 2, field_agent: 1 };
    if (!req.user || (rank[req.user.role] || 0) < (rank[min] || 0)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
};
exports.requireRole = requireRole;
