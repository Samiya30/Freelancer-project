import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import clientsRouter from "./routes/clients.js";
import leadsRouter from "./routes/leads.js";
import proposalsRouter from "./routes/proposals.js";
import contractsRouter from "./routes/contracts.js";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import timeRouter from "./routes/time.js";
import invoicesRouter from "./routes/invoices.js";
import paymentsRouter from "./routes/payments.js";
import expensesRouter from "./routes/expenses.js";
import filesRouter from "./routes/files.js";
import settingsRouter from "./routes/settings.js";
import reportsRouter from "./routes/reports.js";
import dashboardRouter from "./routes/dashboard.js";
import authRouter from "./routes/auth.js";
import membersRouter from "./routes/members.js";

const app = express();

const PORT = Number(process.env.PORT) || 4000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:3000";

/*
 * Security headers
 */
app.use(helmet());

/*
 * CORS
 *
 * The frontend origin is configurable so the same
 * API can be used in development and production.
 */
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

/*
 * Request body parsing
 */
app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

app.use(cookieParser());

/*
 * Health check
 *
 * Intentionally public so deployment/infrastructure
 * services can verify that the API is running.
 */
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "FreelanceOS API is running",
    timestamp: new Date().toISOString(),
  });
});

/*
 * API information
 *
 * Intentionally public.
 */
app.get("/api", (_req, res) => {
  res.json({
    success: true,
    name: "FreelanceOS API",
    version: "1.0.0",
  });
});

/*
 * API routes
 *
 * Individual routers are responsible for
 * authentication and permission enforcement.
 */
app.use("/api/clients", clientsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/time", timeRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/files", filesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/auth", authRouter);
app.use("/api/members", membersRouter);

/*
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/*
 * Global error handler
 *
 * Detailed errors are logged server-side but are
 * not exposed to clients.
 */
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  },
);

/*
 * Start server
 */
app.listen(PORT, () => {
  console.log(
    `FreelanceOS API running on http://localhost:${PORT}`,
  );
});