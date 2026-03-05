import { createPageSchema, reorderPagesSchema, updatePageSchema } from "@kyra/shared";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { parseBody } from "../lib/validate";

export const pages = new Hono<AppEnv>();

// GET / — List all pages
pages.get("/", async (c) => {
	const { data, error } = await supabase
		.from("pages")
		.select("*")
		.order("position", { ascending: true })
		.order("created_at", { ascending: false });

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// POST / — Create page
pages.post("/", requireRole("owner", "admin", "editor"), async (c) => {
	const parsed = await parseBody(c, createPageSchema);
	if ("error" in parsed) return parsed.error;

	// Get next position
	const { data: existing } = await supabase
		.from("pages")
		.select("position")
		.order("position", { ascending: false })
		.limit(1);

	const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

	const { data, error } = await supabase
		.from("pages")
		.insert({ ...parsed.data, position: nextPosition })
		.select()
		.single();

	if (error) {
		if (error.code === "23505") {
			return c.json({ error: "Slug already exists" }, 409);
		}
		return c.json({ error: error.message }, 500);
	}
	return c.json(data, 201);
});

// GET /:id — Get page by id
pages.get("/:id", async (c) => {
	const id = c.req.param("id");
	const { data, error } = await supabase.from("pages").select("*").eq("id", id).single();

	if (error) return c.json({ error: error.message }, 404);
	return c.json(data);
});

// PATCH /:id — Update page
pages.patch("/:id", requireRole("owner", "admin", "editor"), async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, updatePageSchema);
	if ("error" in parsed) return parsed.error;

	const { data, error } = await supabase
		.from("pages")
		.update(parsed.data)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		if (error.code === "23505") {
			return c.json({ error: "Slug already exists" }, 409);
		}
		return c.json({ error: error.message }, 500);
	}
	return c.json(data);
});

// DELETE /:id — Delete page
pages.delete("/:id", requireRole("owner", "admin", "editor"), async (c) => {
	const id = c.req.param("id");
	const { error } = await supabase.from("pages").delete().eq("id", id);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});

// PUT /reorder — Reorder pages
pages.put("/reorder", requireRole("owner", "admin", "editor"), async (c) => {
	const parsed = await parseBody(c, reorderPagesSchema);
	if ("error" in parsed) return parsed.error;

	const { pageIds } = parsed.data as { pageIds: string[] };

	const updates = pageIds.map((id, index) =>
		supabase.from("pages").update({ position: index }).eq("id", id),
	);

	const results = await Promise.all(updates);
	const failed = results.find((r) => r.error);

	if (failed?.error) return c.json({ error: failed.error.message }, 500);
	return c.json({ ok: true });
});
