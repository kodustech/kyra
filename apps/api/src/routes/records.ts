import { buildRecordValidator } from "@kyra/shared";
import type { Field } from "@kyra/shared";
import { asc, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { fields as fieldsTable, records as recordsTable } from "../db/schema";

export const records = new Hono<AppEnv>();

async function getFields(databaseId: string): Promise<Field[]> {
	const data = await db
		.select()
		.from(fieldsTable)
		.where(eq(fieldsTable.databaseId, databaseId))
		.orderBy(asc(fieldsTable.position));

	return data as Field[];
}

// GET / — List records (paginated)
records.get("/", async (c) => {
	const databaseId = c.req.param("databaseId");
	const page = Number(c.req.query("page") || "1");
	const limit = Math.min(Number(c.req.query("limit") || "50"), 100);
	const offset = (page - 1) * limit;

	const [data, [{ total }]] = await Promise.all([
		db
			.select()
			.from(recordsTable)
			.where(eq(recordsTable.databaseId, databaseId))
			.orderBy(desc(recordsTable.createdAt))
			.offset(offset)
			.limit(limit),
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(recordsTable)
			.where(eq(recordsTable.databaseId, databaseId)),
	]);

	return c.json({ data, total, page, limit });
});

// POST / — Create record (with dynamic validation)
records.post("/", requireRole("owner", "admin", "editor"), async (c) => {
	const databaseId = c.req.param("databaseId") as string;

	let dbFields: Field[];
	try {
		dbFields = await getFields(databaseId);
	} catch (err) {
		return c.json({ error: (err as Error).message }, 500);
	}

	const body = await c.req.json();
	const validator = buildRecordValidator(dbFields);
	const result = validator.safeParse(body.data);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	const [data] = await db
		.insert(recordsTable)
		.values({ databaseId, data: result.data as Record<string, unknown> })
		.returning();

	return c.json(data, 201);
});

// PATCH /:recordId — Update record
records.patch("/:recordId", requireRole("owner", "admin", "editor"), async (c) => {
	const recordId = c.req.param("recordId");
	const databaseId = c.req.param("databaseId") as string;

	let dbFields: Field[];
	try {
		dbFields = await getFields(databaseId);
	} catch (err) {
		return c.json({ error: (err as Error).message }, 500);
	}

	const body = await c.req.json();
	const validator = buildRecordValidator(dbFields);
	const result = validator.safeParse(body.data);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	const [data] = await db
		.update(recordsTable)
		.set({ data: result.data as Record<string, unknown>, updatedAt: new Date() })
		.where(eq(recordsTable.id, recordId))
		.returning();

	if (!data) return c.json({ error: "Record not found" }, 404);
	return c.json(data);
});

// DELETE /:recordId — Delete record
records.delete("/:recordId", requireRole("owner", "admin", "editor"), async (c) => {
	const recordId = c.req.param("recordId");
	await db.delete(recordsTable).where(eq(recordsTable.id, recordId));
	return c.json({ ok: true });
});
