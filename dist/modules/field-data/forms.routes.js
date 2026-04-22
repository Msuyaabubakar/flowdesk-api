"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formRouter = void 0;
const express_1 = require("express");
exports.formRouter = (0, express_1.Router)();
exports.formRouter.get('/', (_req, res) => { res.json([]); });
