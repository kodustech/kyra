import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AppEnv, authMiddleware } from "./lib/auth";
import { auth } from "./routes/auth";
import { billingsRoutes } from "./routes/billings";
import { blocks } from "./routes/blocks";
import { commentsRoutes } from "./routes/comments";
import { companySettingsRoutes } from "./routes/company-settings";
import { customerContactsRoutes } from "./routes/customer-contacts";
import { customersRoutes } from "./routes/customers";
import { databases } from "./routes/databases";
import { fields } from "./routes/fields";
import { focusNfeWebhook } from "./routes/focus-nfe-webhook";
import { health } from "./routes/health";
import { invoicesRoutes } from "./routes/invoices";
import { apiKeysRoutes } from "./routes/api-keys";
import { notificationsRoutes } from "./routes/notifications";
import { pages } from "./routes/pages";
import { publicRoutes } from "./routes/public";
import { records } from "./routes/records";
import { uploads } from "./routes/uploads";
import { webhooksRoutes } from "./routes/webhooks";

export const app = new Hono<AppEnv>();

app.use("/*", cors());

// Public routes (no auth)
app.route("/health", health);
app.route("/auth", auth);
app.route("/p", publicRoutes);
app.route("/webhooks/focus-nfe", focusNfeWebhook);

// Protected routes — require auth
app.use("/databases/*", authMiddleware);
app.use("/pages/*", authMiddleware);
app.use("/notifications/*", authMiddleware);
app.use("/api-keys/*", authMiddleware);
app.use("/uploads/*", authMiddleware);
app.use("/webhooks/*", authMiddleware);
app.use("/customers/*", authMiddleware);
app.use("/invoices/*", authMiddleware);
app.use("/billings/*", authMiddleware);
app.use("/company-settings/*", authMiddleware);

app.route("/uploads", uploads);
app.route("/databases", databases);
app.route("/databases/:databaseId/fields", fields);
app.route("/databases/:databaseId/records", records);
app.route("/databases/:databaseId/records/:recordId/comments", commentsRoutes);
app.route("/pages", pages);
app.route("/pages/:pageId/blocks", blocks);
app.route("/notifications", notificationsRoutes);
app.route("/api-keys", apiKeysRoutes);
app.route("/webhooks", webhooksRoutes);
app.route("/customers", customersRoutes);
app.route("/customers/:customerId/contacts", customerContactsRoutes);
app.route("/invoices", invoicesRoutes);
app.route("/billings", billingsRoutes);
app.route("/company-settings", companySettingsRoutes);
