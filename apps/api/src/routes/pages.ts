import { createPageSchema, reorderPagesSchema, updatePageSchema } from "@kyra/shared";
import { asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { pages as pagesTable } from "../db/schema";
import { parseBody } from "../lib/validate";

export const pages = new Hono<AppEnv>();

// GET / — List all pages
pages.get("/", async (c) => {
	const data = await db
		.select()
		.from(pagesTable)
		.orderBy(asc(pagesTable.position), desc(pagesTable.createdAt));

	return c.json(data);
});

// POST / — Create page
pages.post("/", requireRole("owner", "admin", "editor"), async (c) => {
	const parsed = await parseBody(c, createPageSchema);
	if ("error" in parsed) return parsed.error;

	const [last] = await db
		.select({ position: pagesTable.position })
		.from(pagesTable)
		.orderBy(desc(pagesTable.position))
		.limit(1);

	const nextPosition = last?.position != null ? last.position + 1 : 0;

	try {
		const [data] = await db
			.insert(pagesTable)
			.values({ ...parsed.data, position: nextPosition })
			.returning();

		return c.json(data, 201);
	} catch (err: any) {
		if (err.code === "23505") {
			return c.json({ error: "Slug already exists" }, 409);
		}
		return c.json({ error: err.message }, 500);
	}
});

// GET /:id — Get page by id
pages.get("/:id", async (c) => {
	const id = c.req.param("id");
	const [data] = await db.select().from(pagesTable).where(eq(pagesTable.id, id));

	if (!data) return c.json({ error: "Page not found" }, 404);
	return c.json(data);
});

// PATCH /:id — Update page
pages.patch("/:id", requireRole("owner", "admin", "editor"), async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, updatePageSchema);
	if ("error" in parsed) return parsed.error;

	try {
		const [data] = await db
			.update(pagesTable)
			.set({ ...parsed.data, updatedAt: new Date() })
			.where(eq(pagesTable.id, id))
			.returning();

		if (!data) return c.json({ error: "Page not found" }, 404);
		return c.json(data);
	} catch (err: any) {
		if (err.code === "23505") {
			return c.json({ error: "Slug already exists" }, 409);
		}
		return c.json({ error: err.message }, 500);
	}
});

// DELETE /:id — Delete page
pages.delete("/:id", requireRole("owner", "admin", "editor"), async (c) => {
	const id = c.req.param("id");
	await db.delete(pagesTable).where(eq(pagesTable.id, id));
	return c.json({ ok: true });
});

// PUT /reorder — Reorder pages
pages.put("/reorder", requireRole("owner", "admin", "editor"), async (c) => {
	const parsed = await parseBody(c, reorderPagesSchema);
	if ("error" in parsed) return parsed.error;

	const { pageIds } = parsed.data;

	await Promise.all(
		pageIds.map((id, index) =>
			db.update(pagesTable).set({ position: index }).where(eq(pagesTable.id, id)),
		),
	);

	return c.json({ ok: true });
});
