import { handle } from "@hono/node-server/vercel";
import { app } from "./_app.mjs";

export const config = { runtime: "nodejs" };

const handler = handle(app, "/api");

export default handler;
