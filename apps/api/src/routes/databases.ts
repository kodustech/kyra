import { createDatabaseSchema, reorderDatabasesSchema, updateDatabaseSchema } from "@kyra/shared";
import { desc, eq, sql, asc } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { databases as databasesTable } from "../db/schema";
import { parseBody } from "../lib/validate";

export const databases = new Hono<AppEnv>();

// GET / — List all databases
databases.get("/", async (c) => {
	const data = await db
		.select()
		.from(databasesTable)
		.orderBy(asc(databasesTable.position), desc(databasesTable.createdAt));

	return c.json(data);
});

// POST / — Create database
databases.post("/", requireRole("owner", "admin"), async (c) => {
	const parsed = await parseBody(c, createDatabaseSchema);
	if ("error" in parsed) return parsed.error;

	const [last] = await db
		.select({ position: databasesTable.position })
		.from(databasesTable)
		.orderBy(desc(databasesTable.position))
		.limit(1);

	const nextPosition = last?.position != null ? last.position + 1 : 0;

	const [data] = await db
		.insert(databasesTable)
		.values({ ...parsed.data, position: nextPosition })
		.returning();

	return c.json(data, 201);
});

// GET /:id — Get database by id
databases.get("/:id", async (c) => {
	const id = c.req.param("id");
	const [data] = await db.select().from(databasesTable).where(eq(databasesTable.id, id));

	if (!data) return c.json({ error: "Database not found" }, 404);
	return c.json(data);
});

// PATCH /:id — Update database
databases.patch("/:id", requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, updateDatabaseSchema);
	if ("error" in parsed) return parsed.error;

	const [data] = await db
		.update(databasesTable)
		.set({ ...parsed.data, updatedAt: new Date() })
		.where(eq(databasesTable.id, id))
		.returning();

	if (!data) return c.json({ error: "Database not found" }, 404);
	return c.json(data);
});

// DELETE /:id — Delete database
databases.delete("/:id", requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	await db.delete(databasesTable).where(eq(databasesTable.id, id));
	return c.json({ ok: true });
});

// PUT /reorder — Reorder databases
databases.put("/reorder", requireRole("owner", "admin"), async (c) => {
	const parsed = await parseBody(c, reorderDatabasesSchema);
	if ("error" in parsed) return parsed.error;

	const { databaseIds } = parsed.data;

	await Promise.all(
		databaseIds.map((id, index) =>
			db.update(databasesTable).set({ position: index }).where(eq(databasesTable.id, id)),
		),
	);

	return c.json({ ok: true });
});
