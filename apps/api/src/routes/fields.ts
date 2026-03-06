import { bulkCreateFieldsSchema, createFieldSchema, reorderFieldsSchema, updateFieldSchema } from "@kyra/shared";
import type { BulkCreateFieldsInput, CreateFieldInput } from "@kyra/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { fields as fieldsTable } from "../db/schema";
import { parseBody } from "../lib/validate";

export const fields = new Hono<AppEnv>();

// GET / — List fields for a database
fields.get("/", async (c) => {
	const databaseId = c.req.param("databaseId");
	const data = await db
		.select()
		.from(fieldsTable)
		.where(eq(fieldsTable.databaseId, databaseId))
		.orderBy(asc(fieldsTable.position));

	return c.json(data);
});

// POST / — Create field
fields.post("/", requireRole("owner", "admin"), async (c) => {
	const databaseId = c.req.param("databaseId");
	const parsed = await parseBody(c, createFieldSchema);
	if ("error" in parsed) return parsed.error;

	const body = parsed.data as CreateFieldInput;

	// Enforce max 1 kanban_status per database
	if (body.type === "kanban_status") {
		const existing = await db
			.select({ id: fieldsTable.id })
			.from(fieldsTable)
			.where(and(eq(fieldsTable.databaseId, databaseId), eq(fieldsTable.type, "kanban_status")))
			.limit(1);

		if (existing.length > 0) {
			return c.json({ error: "Only one Kanban Status field is allowed per database" }, 400);
		}
	}

	// Get next position
	const [last] = await db
		.select({ position: fieldsTable.position })
		.from(fieldsTable)
		.where(eq(fieldsTable.databaseId, databaseId))
		.orderBy(desc(fieldsTable.position))
		.limit(1);

	const nextPosition = last ? last.position + 1 : 0;

	// Default settings for kanban_status and label
	let settings = body.settings ?? null;
	if (body.type === "kanban_status" && !body.settings) {
		settings = {
			options: [
				{ id: "todo", label: "To-do", color: "gray", icon: "circle" },
				{ id: "in-progress", label: "In Progress", color: "blue", icon: "loader" },
				{ id: "done", label: "Done", color: "green", icon: "circle-check" },
			],
		};
	} else if (body.type === "label" && !body.settings) {
		settings = {
			options: [
				{ id: "bug", label: "Bug", color: "red", icon: null },
				{ id: "feature", label: "Feature", color: "blue", icon: null },
				{ id: "improvement", label: "Improvement", color: "green", icon: null },
			],
		};
	}

	const [data] = await db
		.insert(fieldsTable)
		.values({
			name: body.name,
			type: body.type,
			required: body.type === "kanban_status" || body.type === "label" || body.type === "assignee" ? false : body.required,
			mask: body.type === "assignee" || body.type === "label" ? null : (body.mask ?? null),
			options: body.options ?? null,
			settings,
			highlight: body.highlight ?? false,
			databaseId,
			position: nextPosition,
		})
		.returning();

	return c.json(data, 201);
});

// POST /bulk — Bulk create fields
fields.post("/bulk", requireRole("owner", "admin"), async (c) => {
	const databaseId = c.req.param("databaseId");
	const parsed = await parseBody(c, bulkCreateFieldsSchema);
	if ("error" in parsed) return parsed.error;

	const { fields: inputs } = parsed.data as BulkCreateFieldsInput;

	// Enforce max 1 kanban_status (batch + existing)
	const kanbanInBatch = inputs.filter((f) => f.type === "kanban_status").length;
	if (kanbanInBatch > 1) {
		return c.json({ error: "Only one Kanban Status field is allowed per database" }, 400);
	}

	if (kanbanInBatch === 1) {
		const existing = await db
			.select({ id: fieldsTable.id })
			.from(fieldsTable)
			.where(and(eq(fieldsTable.databaseId, databaseId), eq(fieldsTable.type, "kanban_status")))
			.limit(1);

		if (existing.length > 0) {
			return c.json({ error: "Only one Kanban Status field is allowed per database" }, 400);
		}
	}

	// Get start position
	const [last] = await db
		.select({ position: fieldsTable.position })
		.from(fieldsTable)
		.where(eq(fieldsTable.databaseId, databaseId))
		.orderBy(desc(fieldsTable.position))
		.limit(1);

	const startPosition = last ? last.position + 1 : 0;

	// Build rows
	const rows = inputs.map((input, index) => {
		let settings = input.settings ?? null;
		if (input.type === "kanban_status" && !input.settings) {
			settings = {
				options: [
					{ id: "todo", label: "To-do", color: "gray", icon: "circle" },
					{ id: "in-progress", label: "In Progress", color: "blue", icon: "loader" },
					{ id: "done", label: "Done", color: "green", icon: "circle-check" },
				],
			};
		} else if (input.type === "label" && !input.settings) {
			settings = {
				options: [
					{ id: "bug", label: "Bug", color: "red", icon: null },
					{ id: "feature", label: "Feature", color: "blue", icon: null },
					{ id: "improvement", label: "Improvement", color: "green", icon: null },
				],
			};
		}

		return {
			name: input.name,
			type: input.type,
			required: input.type === "kanban_status" || input.type === "label" || input.type === "assignee" ? false : input.required,
			mask: input.type === "assignee" || input.type === "label" ? null : (input.mask ?? null),
			options: input.options ?? null,
			settings,
			highlight: input.highlight ?? false,
			databaseId,
			position: startPosition + index,
		};
	});

	const data = await db.insert(fieldsTable).values(rows).returning();

	return c.json(data, 201);
});

// PATCH /:fieldId — Update field
fields.patch("/:fieldId", requireRole("owner", "admin"), async (c) => {
	const fieldId = c.req.param("fieldId");
	const parsed = await parseBody(c, updateFieldSchema);
	if ("error" in parsed) return parsed.error;

	const [data] = await db
		.update(fieldsTable)
		.set({ ...parsed.data, updatedAt: new Date() })
		.where(eq(fieldsTable.id, fieldId))
		.returning();

	if (!data) return c.json({ error: "Field not found" }, 404);
	return c.json(data);
});

// DELETE /:fieldId — Delete field
fields.delete("/:fieldId", requireRole("owner", "admin"), async (c) => {
	const fieldId = c.req.param("fieldId");
	await db.delete(fieldsTable).where(eq(fieldsTable.id, fieldId));
	return c.json({ ok: true });
});

// PUT /reorder — Reorder fields
fields.put("/reorder", requireRole("owner", "admin"), async (c) => {
	const parsed = await parseBody(c, reorderFieldsSchema);
	if ("error" in parsed) return parsed.error;

	const { fieldIds } = parsed.data;

	await Promise.all(
		fieldIds.map((id, index) =>
			db.update(fieldsTable).set({ position: index }).where(eq(fieldsTable.id, id)),
		),
	);

	return c.json({ ok: true });
});
