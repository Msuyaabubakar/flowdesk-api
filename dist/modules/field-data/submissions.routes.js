"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subRouter = void 0;
const express_1 = require("express");
exports.subRouter = (0, express_1.Router)();
exports.subRouter.get('/', (_req, res) => { res.json([]); });
