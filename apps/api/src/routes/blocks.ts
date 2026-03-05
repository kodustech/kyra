import { createBlockSchema, reorderBlocksSchema, updateBlockSchema } from "@kyra/shared";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { parseBody } from "../lib/validate";

export const blocks = new Hono<AppEnv>();

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
blocks.post("/", requireRole("owner", "admin", "editor"), async (c) => {
	const pageId = c.req.param("pageId");
	const parsed = await parseBody(c, createBlockSchema);
	if ("error" in parsed) return parsed.error;

	const body = parsed.data;

	// Get next position
	const { data: existing } = await supabase
		.from("blocks")
		.select("position")
		.eq("page_id", pageId)
		.order("position", { ascending: false })
		.limit(1);

	const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

	let blockTitle: string | null = null;
	if (body.view_type !== "richtext") {
		const { data: db } = await supabase
			.from("databases")
			.select("name")
			.eq("id", body.database_id)
			.single();
		blockTitle = db?.name ?? null;
	}

	const insertPayload =
		body.view_type === "richtext"
			? {
					page_id: pageId,
					view_type: body.view_type,
					content: body.content ?? "",
					position: nextPosition,
				}
			: {
					page_id: pageId,
					database_id: body.database_id,
					view_type: body.view_type,
					title: blockTitle,
					position: nextPosition,
				};

	const { data, error } = await supabase
		.from("blocks")
		.insert(insertPayload)
		.select("*, database:databases(*)")
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data, 201);
});

// PATCH /:blockId — Update block
blocks.patch("/:blockId", requireRole("owner", "admin", "editor"), async (c) => {
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
blocks.delete("/:blockId", requireRole("owner", "admin", "editor"), async (c) => {
	const blockId = c.req.param("blockId");
	const { error } = await supabase.from("blocks").delete().eq("id", blockId);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});

// PUT /reorder — Reorder blocks
blocks.put("/reorder", requireRole("owner", "admin", "editor"), async (c) => {
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
