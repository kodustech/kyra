import { buildRecordValidator, resolveRecordSlugs } from "@kyra/shared";
import type { Field, LookupSettings } from "@kyra/shared";
import { asc, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { fields as fieldsTable, records as recordsTable, databases as databasesTable } from "../db/schema";
import { dispatchWebhooks } from "../lib/webhook";

export const records = new Hono<AppEnv>();

function enrichRecord(
	record: { id: string; databaseId: string; data: Record<string, unknown>; createdAt: unknown; updatedAt: unknown },
	fields: Field[],
) {
	const idToSlug = new Map(fields.map((f) => [f.id, f.slug]));
	const slugData: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record.data)) {
		const slug = idToSlug.get(key);
		slugData[slug ?? key] = value;
	}
	return { ...record, slugData };
}

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

	const [data, [{ total }], dbFields] = await Promise.all([
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
		getFields(databaseId),
	]);

	return c.json({ data: data.map((r) => enrichRecord(r, dbFields)), total, page, limit });
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
	const resolvedData = resolveRecordSlugs(body.data ?? {}, dbFields);
	const validator = buildRecordValidator(dbFields);
	const result = validator.safeParse(resolvedData);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	const [data] = await db
		.insert(recordsTable)
		.values({ databaseId, data: result.data as Record<string, unknown> })
		.returning();

	// Dispatch webhook
	const [database] = await db.select({ name: databasesTable.name }).from(databasesTable).where(eq(databasesTable.id, databaseId));
	dispatchWebhooks("record.created", {
		database: { id: databaseId, name: database?.name },
		record: data,
	});

	return c.json(enrichRecord(data, dbFields), 201);
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
	const resolvedData = resolveRecordSlugs(body.data ?? {}, dbFields);
	const validator = buildRecordValidator(dbFields);
	const result = validator.safeParse(resolvedData);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	// Get old data before update to detect changes
	const [oldRecord] = await db.select().from(recordsTable).where(eq(recordsTable.id, recordId));

	const [data] = await db
		.update(recordsTable)
		.set({ data: result.data as Record<string, unknown>, updatedAt: new Date() })
		.where(eq(recordsTable.id, recordId))
		.returning();

	if (!data) return c.json({ error: "Record not found" }, 404);

	// Dispatch webhook with changes
	const [database] = await db.select({ name: databasesTable.name }).from(databasesTable).where(eq(databasesTable.id, databaseId));
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	if (oldRecord) {
		const oldData = oldRecord.data as Record<string, unknown>;
		const newData = result.data as Record<string, unknown>;
		for (const key of Object.keys(newData)) {
			if (oldData[key] !== newData[key]) {
				changes[key] = { from: oldData[key], to: newData[key] };
			}
		}
	}
	dispatchWebhooks("record.updated", {
		database: { id: databaseId, name: database?.name },
		record: data,
		changes,
	});

	return c.json(enrichRecord(data, dbFields));
});

// DELETE /:recordId — Delete record
records.delete("/:recordId", requireRole("owner", "admin", "editor"), async (c) => {
	const recordId = c.req.param("recordId");
	const databaseId = c.req.param("databaseId") as string;

	// Get record before deleting for webhook payload
	const [record] = await db.select().from(recordsTable).where(eq(recordsTable.id, recordId));

	await db.delete(recordsTable).where(eq(recordsTable.id, recordId));

	if (record) {
		const [database] = await db.select({ name: databasesTable.name }).from(databasesTable).where(eq(databasesTable.id, databaseId));
		dispatchWebhooks("record.deleted", {
			database: { id: databaseId, name: database?.name },
			record,
		});
	}

	return c.json({ ok: true });
});

// GET /lookup-options/:fieldId — Get filtered options for a lookup field
records.get("/lookup-options/:fieldId", async (c) => {
	const fieldId = c.req.param("fieldId");

	// Get the lookup field
	const [field] = await db
		.select()
		.from(fieldsTable)
		.where(eq(fieldsTable.id, fieldId));

	if (!field || field.type !== "lookup" || !field.lookupSettings) {
		return c.json({ error: "Invalid lookup field" }, 400);
	}

	const settings = field.lookupSettings as LookupSettings;

	// Get all records from the source database
	const sourceRecords = await db
		.select()
		.from(recordsTable)
		.where(eq(recordsTable.databaseId, settings.sourceDatabaseId))
		.orderBy(desc(recordsTable.createdAt));

	// Get source fields for filtering reference
	const sourceFields = await db
		.select()
		.from(fieldsTable)
		.where(eq(fieldsTable.databaseId, settings.sourceDatabaseId));

	// Apply filters in-memory on the JSONB data
	const filtered = sourceRecords.filter((record) => {
		const data = record.data as Record<string, unknown>;
		return settings.filters.every((filter) => {
			const val = data[filter.fieldId];
			const strVal = val == null ? "" : String(val);

			switch (filter.operator) {
				case "eq":
					return strVal === filter.value;
				case "neq":
					return strVal !== filter.value;
				case "gt":
					return Number(strVal) > Number(filter.value);
				case "lt":
					return Number(strVal) < Number(filter.value);
				case "gte":
					return Number(strVal) >= Number(filter.value);
				case "lte":
					return Number(strVal) <= Number(filter.value);
				case "contains":
					return strVal.toLowerCase().includes(filter.value.toLowerCase());
				case "is_null":
					return val == null || strVal === "";
				case "is_not_null":
					return val != null && strVal !== "";
				default:
					return true;
			}
		});
	});

	// Map to options: { value, label }
	const valueFieldId = settings.valueFieldId || "id";
	const options = filtered.map((record) => {
		const data = record.data as Record<string, unknown>;
		return {
			value: valueFieldId === "id" ? record.id : String(data[valueFieldId] ?? record.id),
			label: String(data[settings.displayFieldId] ?? ""),
		};
	});

	return c.json({ options, sourceFields });
});
