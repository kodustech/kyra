import { createApiKeySchema } from "@kyra/shared";
import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, authMiddleware, requireRole } from "../lib/auth";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { parseBody } from "../lib/validate";

export const apiKeysRoutes = new Hono<AppEnv>();

// All routes require auth
apiKeysRoutes.use("/*", authMiddleware);

// GET / — List my API keys
apiKeysRoutes.get("/", async (c) => {
	const user = c.get("user");
	const data = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt,
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, user.id))
		.orderBy(desc(apiKeys.createdAt));

	return c.json(data);
});

// POST / — Create API key
apiKeysRoutes.post("/", async (c) => {
	const user = c.get("user");
	const parsed = await parseBody(c, createApiKeySchema);
	if ("error" in parsed) return parsed.error;

	const { name } = parsed.data;

	// Generate a random API key: kyra_<48 random hex chars>
	const rawKey = `kyra_${crypto.randomBytes(24).toString("hex")}`;
	const keyPrefix = rawKey.slice(0, 12);
	const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

	const [data] = await db
		.insert(apiKeys)
		.values({ userId: user.id, name, keyHash, keyPrefix })
		.returning({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt,
		});

	// Return the full key only on creation (never stored in plain text)
	return c.json({ ...data, key: rawKey }, 201);
});

// DELETE /:id — Delete API key
apiKeysRoutes.delete("/:id", async (c) => {
	const user = c.get("user");
	const id = c.req.param("id");

	const [deleted] = await db
		.delete(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
		.returning({ id: apiKeys.id });

	if (!deleted) return c.json({ error: "API key not found" }, 404);
	return c.json({ ok: true });
});
