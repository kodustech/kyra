import { buildRecordValidator } from "@kyra/shared";
import type { Field } from "@kyra/shared";
import { Hono } from "hono";
import { supabase } from "../lib/supabase";

export const publicRoutes = new Hono();

// GET /:slug — Get public page with blocks, fields, and records
publicRoutes.get("/:slug", async (c) => {
	const slug = c.req.param("slug");

	// Get the page
	const { data: page, error: pageError } = await supabase
		.from("pages")
		.select("*")
		.eq("slug", slug)
		.eq("published", true)
		.single();

	if (pageError || !page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Get blocks with their databases
	const { data: blocks, error: blocksError } = await supabase
		.from("blocks")
		.select("*, database:databases(*)")
		.eq("page_id", page.id)
		.order("position", { ascending: true });

	if (blocksError) return c.json({ error: blocksError.message }, 500);

	// For each block, get fields and records (skip for richtext blocks)
	const blocksWithData = await Promise.all(
		(blocks || []).map(async (block) => {
			if (block.view_type === "richtext") {
				return { ...block, fields: [], records: [] };
			}

			const { data: fields } = await supabase
				.from("fields")
				.select("*")
				.eq("database_id", block.database_id)
				.order("position", { ascending: true });

			const { data: records } = await supabase
				.from("records")
				.select("*")
				.eq("database_id", block.database_id)
				.order("created_at", { ascending: false });

			return {
				...block,
				fields: fields || [],
				records: records || [],
			};
		}),
	);

	return c.json({ ...page, blocks: blocksWithData });
});

// PATCH /:slug/records/:recordId — Update record on public page (e.g. drag-and-drop kanban)
publicRoutes.patch("/:slug/records/:recordId", async (c) => {
	const slug = c.req.param("slug");
	const recordId = c.req.param("recordId");

	// Verify page is published
	const { data: page } = await supabase
		.from("pages")
		.select("id")
		.eq("slug", slug)
		.eq("published", true)
		.single();

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	const body = await c.req.json();
	if (!body.data || typeof body.data !== "object") {
		return c.json({ error: "Invalid data" }, 400);
	}

	// Get existing record
	const { data: record, error: recordError } = await supabase
		.from("records")
		.select("*")
		.eq("id", recordId)
		.single();

	if (recordError || !record) {
		return c.json({ error: "Record not found" }, 404);
	}

	// Verify the record's database belongs to a block on this page
	const { data: block } = await supabase
		.from("blocks")
		.select("id")
		.eq("page_id", page.id)
		.eq("database_id", record.database_id)
		.limit(1)
		.single();

	if (!block) {
		return c.json({ error: "Record does not belong to this page" }, 403);
	}

	// Merge data
	const mergedData = { ...record.data, ...body.data };

	const { data: updated, error } = await supabase
		.from("records")
		.update({ data: mergedData })
		.eq("id", recordId)
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(updated);
});

// POST /:slug/submit/:blockId — Submit form on public page
publicRoutes.post("/:slug/submit/:blockId", async (c) => {
	const slug = c.req.param("slug");
	const blockId = c.req.param("blockId");

	// Verify page is published
	const { data: page } = await supabase
		.from("pages")
		.select("id")
		.eq("slug", slug)
		.eq("published", true)
		.single();

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Get block and verify it belongs to this page
	const { data: block } = await supabase
		.from("blocks")
		.select("*")
		.eq("id", blockId)
		.eq("page_id", page.id)
		.single();

	if (!block) {
		return c.json({ error: "Block not found" }, 404);
	}

	if (block.view_type === "richtext") {
		return c.json({ error: "Rich text blocks do not accept submissions" }, 400);
	}

	// Get fields for validation
	const { data: fields, error: fieldsError } = await supabase
		.from("fields")
		.select("*")
		.eq("database_id", block.database_id)
		.order("position", { ascending: true });

	if (fieldsError) return c.json({ error: fieldsError.message }, 500);

	const body = await c.req.json();
	const validator = buildRecordValidator((fields || []) as Field[]);
	const result = validator.safeParse(body.data);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	const { data, error } = await supabase
		.from("records")
		.insert({ database_id: block.database_id, data: result.data })
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data, 201);
});
