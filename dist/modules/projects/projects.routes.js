"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
exports.projectRouter = (0, express_1.Router)();
exports.projectRouter.get('/', (_req, res) => { res.json([]); });
