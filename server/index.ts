import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// tRPC API
app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter })
);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`   tRPC: http://localhost:${PORT}/api/trpc`);
});
