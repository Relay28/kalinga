"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateToken = generateToken;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '24h';
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, BCRYPT_SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}
function generateToken(userId, role) {
    return jsonwebtoken_1.default.sign({ userId, role }, env_js_1.config.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
//# sourceMappingURL=authService.js.map