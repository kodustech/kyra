import { createWebhookSchema, updateWebhookSchema } from "@kyra/shared";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, authMiddleware, requireRole } from "../lib/auth";
import { db } from "../db";
import { webhooks } from "../db/schema";
import { parseBody } from "../lib/validate";

export const webhooksRoutes = new Hono<AppEnv>();

webhooksRoutes.use("/*", authMiddleware);

// GET / — List all webhooks
webhooksRoutes.get("/", async (c) => {
	const data = await db
		.select()
		.from(webhooks)
		.orderBy(desc(webhooks.createdAt));

	return c.json(data);
});

// POST / — Create webhook (owner/admin only)
webhooksRoutes.post("/", requireRole("owner", "admin"), async (c) => {
	const user = c.get("user");
	const parsed = await parseBody(c, createWebhookSchema);
	if ("error" in parsed) return parsed.error;

	const [data] = await db
		.insert(webhooks)
		.values({ ...parsed.data, createdBy: user.id })
		.returning();

	return c.json(data, 201);
});

// PATCH /:id — Update webhook
webhooksRoutes.patch("/:id", requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, updateWebhookSchema);
	if ("error" in parsed) return parsed.error;

	const [data] = await db
		.update(webhooks)
		.set({ ...parsed.data, updatedAt: new Date() })
		.where(eq(webhooks.id, id))
		.returning();

	if (!data) return c.json({ error: "Webhook not found" }, 404);
	return c.json(data);
});

// DELETE /:id — Delete webhook
webhooksRoutes.delete("/:id", requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	await db.delete(webhooks).where(eq(webhooks.id, id));
	return c.json({ ok: true });
});
