"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
try {
    dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
}
catch (e) {
    console.warn('Failed to set custom DNS servers, using system defaults.');
}
dns_1.default.setDefaultResultOrder('ipv4first');
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const spreadsheet_routes_1 = __importDefault(require("./routes/spreadsheet.routes"));
const workflow_routes_1 = __importDefault(require("./routes/workflow.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB Atlas
(0, db_1.connectDB)();
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // Allow Astro local frontend and any deploy previews
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Health Check API
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'SheetPilot AI Backend', timestamp: new Date() });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/spreadsheet', spreadsheet_routes_1.default);
app.use('/api/workflows', workflow_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
// Error Handling Middleware
app.use(error_middleware_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`SheetPilot AI backend running on port ${PORT}`);
});
