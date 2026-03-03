import { Hono } from "hono";
import { cors } from "hono/cors";
import { blocks } from "./routes/blocks";
import { databases } from "./routes/databases";
import { fields } from "./routes/fields";
import { health } from "./routes/health";
import { pages } from "./routes/pages";
import { publicRoutes } from "./routes/public";
import { records } from "./routes/records";

const app = new Hono();

app.use("/*", cors());
app.route("/health", health);
app.route("/databases", databases);
app.route("/databases/:databaseId/fields", fields);
app.route("/databases/:databaseId/records", records);
app.route("/pages", pages);
app.route("/pages/:pageId/blocks", blocks);
app.route("/p", publicRoutes);

export default {
	port: 3000,
	fetch: app.fetch,
};
