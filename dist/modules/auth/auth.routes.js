"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
/**
 * Test route
 * GET /api/auth
 */
router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Auth module working"
    });
});
exports.authRouter = (0, express_1.Router)();
