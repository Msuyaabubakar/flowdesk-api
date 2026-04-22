"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachRouter = void 0;
const express_1 = require("express");
exports.attachRouter = (0, express_1.Router)();
exports.attachRouter.get('/', (_req, res) => { res.json([]); });
