import { Hono } from "hono";
import { handle } from "@hono/node-server/vercel";
import { app } from "./_app.mjs";

const wrapper = new Hono();
wrapper.route("/api", app);

export const config = { runtime: "nodejs" };

export default handle(wrapper);
