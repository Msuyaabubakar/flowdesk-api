"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifRouter = void 0;
const express_1 = require("express");
exports.notifRouter = (0, express_1.Router)();
exports.notifRouter.get('/', (_req, res) => { res.json([]); });
