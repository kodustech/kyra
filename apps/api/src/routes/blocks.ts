import { createBlockSchema, reorderBlocksSchema, updateBlockSchema } from "@kyra/shared";
import type { CreateBlockInput } from "@kyra/shared";
import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import { parseBody } from "../lib/validate";

export const blocks = new Hono();

// GET / — List blocks for a page
blocks.get("/", async (c) => {
	const pageId = c.req.param("pageId");
	const { data, error } = await supabase
		.from("blocks")
		.select("*, database:databases(*)")
		.eq("page_id", pageId)
		.order("position", { ascending: true });

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// POST / — Create block
blocks.post("/", async (c) => {
	const pageId = c.req.param("pageId");
	const parsed = await parseBody(c, createBlockSchema);
	if ("error" in parsed) return parsed.error;

	const body = parsed.data as CreateBlockInput;

	// Get next position
	const { data: existing } = await supabase
		.from("blocks")
		.select("position")
		.eq("page_id", pageId)
		.order("position", { ascending: false })
		.limit(1);

	const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

	const { data, error } = await supabase
		.from("blocks")
		.insert({
			page_id: pageId,
			database_id: body.database_id,
			view_type: body.view_type,
			position: nextPosition,
		})
		.select("*, database:databases(*)")
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data, 201);
});

// PATCH /:blockId — Update block
blocks.patch("/:blockId", async (c) => {
	const blockId = c.req.param("blockId");
	const parsed = await parseBody(c, updateBlockSchema);
	if ("error" in parsed) return parsed.error;

	const { data, error } = await supabase
		.from("blocks")
		.update(parsed.data)
		.eq("id", blockId)
		.select("*, database:databases(*)")
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// DELETE /:blockId — Delete block
blocks.delete("/:blockId", async (c) => {
	const blockId = c.req.param("blockId");
	const { error } = await supabase.from("blocks").delete().eq("id", blockId);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});

// PUT /reorder — Reorder blocks
blocks.put("/reorder", async (c) => {
	const parsed = await parseBody(c, reorderBlocksSchema);
	if ("error" in parsed) return parsed.error;

	const { blockIds } = parsed.data as { blockIds: string[] };

	const updates = blockIds.map((id, index) =>
		supabase.from("blocks").update({ position: index }).eq("id", id),
	);

	const results = await Promise.all(updates);
	const failed = results.find((r) => r.error);

	if (failed?.error) return c.json({ error: failed.error.message }, 500);
	return c.json({ ok: true });
});
