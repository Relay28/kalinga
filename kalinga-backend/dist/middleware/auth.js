"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    // Support prototype mock JWT token bypass for seamless offline/dev testing
    if (token === 'mock-jwt-token') {
        const isObGynRoute = req.originalUrl.includes('/queue') || req.originalUrl.includes('/verdict') || req.originalUrl.includes('/report');
        req.userId = isObGynRoute ? 'f6e5d4c3-b2a1-0f9e-8d7c-6b5a4f3e2d1c' : 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
        req.userRole = isObGynRoute ? 'obgyn' : 'midwife';
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_js_1.config.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.userId || !req.userRole) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.userRole)) {
            return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map