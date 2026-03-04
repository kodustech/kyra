import { bulkCreateFieldsSchema, createFieldSchema, reorderFieldsSchema, updateFieldSchema } from "@kyra/shared";
import type { BulkCreateFieldsInput, CreateFieldInput } from "@kyra/shared";
import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import { parseBody } from "../lib/validate";

export const fields = new Hono();

// GET / — List fields for a database
fields.get("/", async (c) => {
	const databaseId = c.req.param("databaseId");
	const { data, error } = await supabase
		.from("fields")
		.select("*")
		.eq("database_id", databaseId)
		.order("position", { ascending: true });

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// POST / — Create field
fields.post("/", async (c) => {
	const databaseId = c.req.param("databaseId");
	const parsed = await parseBody(c, createFieldSchema);
	if ("error" in parsed) return parsed.error;

	const body = parsed.data as CreateFieldInput;

	// Enforce max 1 kanban_status per database
	if (body.type === "kanban_status") {
		const { data: existingKanban } = await supabase
			.from("fields")
			.select("id")
			.eq("database_id", databaseId)
			.eq("type", "kanban_status")
			.limit(1);

		if (existingKanban && existingKanban.length > 0) {
			return c.json({ error: "Only one Kanban Status field is allowed per database" }, 400);
		}
	}

	// Get next position
	const { data: existing } = await supabase
		.from("fields")
		.select("position")
		.eq("database_id", databaseId)
		.order("position", { ascending: false })
		.limit(1);

	const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

	// Default settings for kanban_status
	const settings =
		body.type === "kanban_status" && !body.settings
			? {
					options: [
						{ id: "todo", label: "To-do", color: "gray", icon: "circle" },
						{ id: "in-progress", label: "In Progress", color: "blue", icon: "loader" },
						{ id: "done", label: "Done", color: "green", icon: "circle-check" },
					],
				}
			: (body.settings ?? null);

	const { data, error } = await supabase
		.from("fields")
		.insert({
			name: body.name,
			type: body.type,
			required: body.type === "kanban_status" ? false : body.required,
			mask: body.mask ?? null,
			options: body.options ?? null,
			settings,
			highlight: body.highlight ?? false,
			database_id: databaseId,
			position: nextPosition,
		})
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data, 201);
});

// POST /bulk — Bulk create fields
fields.post("/bulk", async (c) => {
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
		const { data: existingKanban } = await supabase
			.from("fields")
			.select("id")
			.eq("database_id", databaseId)
			.eq("type", "kanban_status")
			.limit(1);

		if (existingKanban && existingKanban.length > 0) {
			return c.json({ error: "Only one Kanban Status field is allowed per database" }, 400);
		}
	}

	// Get start position
	const { data: existing } = await supabase
		.from("fields")
		.select("position")
		.eq("database_id", databaseId)
		.order("position", { ascending: false })
		.limit(1);

	const startPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

	// Build rows
	const rows = inputs.map((input, index) => {
		const settings =
			input.type === "kanban_status" && !input.settings
				? {
						options: [
							{ id: "todo", label: "To-do", color: "gray", icon: "circle" },
							{ id: "in-progress", label: "In Progress", color: "blue", icon: "loader" },
							{ id: "done", label: "Done", color: "green", icon: "circle-check" },
						],
					}
				: (input.settings ?? null);

		return {
			name: input.name,
			type: input.type,
			required: input.type === "kanban_status" ? false : input.required,
			mask: input.mask ?? null,
			options: input.options ?? null,
			settings,
			highlight: input.highlight ?? false,
			database_id: databaseId,
			position: startPosition + index,
		};
	});

	const { data, error } = await supabase.from("fields").insert(rows).select();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data, 201);
});

// PATCH /:fieldId — Update field
fields.patch("/:fieldId", async (c) => {
	const fieldId = c.req.param("fieldId");
	const parsed = await parseBody(c, updateFieldSchema);
	if ("error" in parsed) return parsed.error;

	const { data, error } = await supabase
		.from("fields")
		.update(parsed.data)
		.eq("id", fieldId)
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// DELETE /:fieldId — Delete field
fields.delete("/:fieldId", async (c) => {
	const fieldId = c.req.param("fieldId");
	const { error } = await supabase.from("fields").delete().eq("id", fieldId);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});

// PUT /reorder — Reorder fields
fields.put("/reorder", async (c) => {
	const parsed = await parseBody(c, reorderFieldsSchema);
	if ("error" in parsed) return parsed.error;

	const { fieldIds } = parsed.data as { fieldIds: string[] };

	const updates = fieldIds.map((id, index) =>
		supabase.from("fields").update({ position: index }).eq("id", id),
	);

	const results = await Promise.all(updates);
	const failed = results.find((r) => r.error);

	if (failed?.error) return c.json({ error: failed.error.message }, 500);
	return c.json({ ok: true });
});
