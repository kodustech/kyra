import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AppEnv, authMiddleware } from "./lib/auth";
import { auth } from "./routes/auth";
import { blocks } from "./routes/blocks";
import { commentsRoutes } from "./routes/comments";
import { databases } from "./routes/databases";
import { fields } from "./routes/fields";
import { health } from "./routes/health";
import { notificationsRoutes } from "./routes/notifications";
import { pages } from "./routes/pages";
import { publicRoutes } from "./routes/public";
import { records } from "./routes/records";

export const app = new Hono<AppEnv>();

app.use("/*", cors());

// Public routes (no auth)
app.route("/health", health);
app.route("/auth", auth);
app.route("/p", publicRoutes);

// Protected routes — require auth
app.use("/databases/*", authMiddleware);
app.use("/pages/*", authMiddleware);
app.use("/notifications/*", authMiddleware);

app.route("/databases", databases);
app.route("/databases/:databaseId/fields", fields);
app.route("/databases/:databaseId/records", records);
app.route("/databases/:databaseId/records/:recordId/comments", commentsRoutes);
app.route("/pages", pages);
app.route("/pages/:pageId/blocks", blocks);
app.route("/notifications", notificationsRoutes);
