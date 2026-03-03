import { createFieldSchema, reorderFieldsSchema, updateFieldSchema } from "@kyra/shared";
import type { CreateFieldInput } from "@kyra/shared";
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

	// Get next position
	const { data: existing } = await supabase
		.from("fields")
		.select("position")
		.eq("database_id", databaseId)
		.order("position", { ascending: false })
		.limit(1);

	const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

	const { data, error } = await supabase
		.from("fields")
		.insert({
			name: body.name,
			type: body.type,
			required: body.required,
			mask: body.mask ?? null,
			options: body.options ?? null,
			database_id: databaseId,
			position: nextPosition,
		})
		.select()
		.single();

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
