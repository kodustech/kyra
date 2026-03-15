import { bulkCreateFieldsSchema, createFieldSchema, reorderFieldsSchema, updateFieldSchema, toSlug } from "@kyra/shared";
import type { BulkCreateFieldsInput, CreateFieldInput } from "@kyra/shared";
import { and, asc, desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { fields as fieldsTable } from "../db/schema";
import { parseBody } from "../lib/validate";

export const fields = new Hono<AppEnv>();

async function uniqueSlug(databaseId: string, baseSlug: string, excludeFieldId?: string): Promise<string> {
	const existing = await db
		.select({ slug: fieldsTable.slug })
		.from(fieldsTable)
		.where(and(eq(fieldsTable.databaseId, databaseId), like(fieldsTable.slug, `${baseSlug}%`)));

	const taken = new Set(existing.map((r) => r.slug));
	if (excludeFieldId) {
		// When updating, exclude the field itself from collision check
		const [self] = await db.select({ slug: fieldsTable.slug }).from(fieldsTable).where(eq(fieldsTable.id, excludeFieldId));
		if (self) taken.delete(self.slug);
	}

	if (!taken.has(baseSlug)) return baseSlug;

	let i = 2;
	while (taken.has(`${baseSlug}-${i}`)) i++;
	return `${baseSlug}-${i}`;
}

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

	const slug = await uniqueSlug(databaseId, toSlug(body.name));

	const [data] = await db
		.insert(fieldsTable)
		.values({
			name: body.name,
			slug,
			type: body.type,
			required: body.type === "kanban_status" || body.type === "label" || body.type === "assignee" || body.type === "lookup" || body.type === "formula" ? false : body.required,
			mask: body.type === "assignee" || body.type === "label" || body.type === "lookup" || body.type === "formula" ? null : (body.mask ?? null),
			options: body.options ?? null,
			settings,
			lookupSettings: body.type === "lookup" ? (body.lookupSettings ?? null) : null,
			formulaExpression: body.type === "formula" ? (body.formulaExpression ?? null) : null,
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

	// Generate unique slugs for the batch
	const existingSlugs = await db
		.select({ slug: fieldsTable.slug })
		.from(fieldsTable)
		.where(eq(fieldsTable.databaseId, databaseId));
	const takenSlugs = new Set(existingSlugs.map((r) => r.slug));

	function nextSlug(name: string): string {
		const base = toSlug(name);
		let candidate = base;
		let i = 2;
		while (takenSlugs.has(candidate)) {
			candidate = `${base}-${i}`;
			i++;
		}
		takenSlugs.add(candidate);
		return candidate;
	}

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
			slug: nextSlug(input.name),
			type: input.type,
			required: input.type === "kanban_status" || input.type === "label" || input.type === "assignee" || input.type === "lookup" || input.type === "formula" ? false : input.required,
			mask: input.type === "assignee" || input.type === "label" || input.type === "lookup" || input.type === "formula" ? null : (input.mask ?? null),
			options: input.options ?? null,
			settings,
			lookupSettings: input.type === "lookup" ? (input.lookupSettings ?? null) : null,
			formulaExpression: input.type === "formula" ? (input.formulaExpression ?? null) : null,
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
	const databaseId = c.req.param("databaseId");
	const parsed = await parseBody(c, updateFieldSchema);
	if ("error" in parsed) return parsed.error;

	const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };

	// Use explicit slug if provided, otherwise regenerate from name
	if (parsed.data.slug) {
		updates.slug = await uniqueSlug(databaseId, parsed.data.slug, fieldId);
	} else if (parsed.data.name) {
		updates.slug = await uniqueSlug(databaseId, toSlug(parsed.data.name), fieldId);
	}

	const [data] = await db
		.update(fieldsTable)
		.set(updates)
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
