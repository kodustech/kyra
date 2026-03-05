import { createDatabaseSchema, reorderDatabasesSchema, updateDatabaseSchema } from "@kyra/shared";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { parseBody } from "../lib/validate";

export const databases = new Hono<AppEnv>();

// GET / — List all databases
databases.get("/", async (c) => {
	const { data, error } = await supabase
		.from("databases")
		.select("*")
		.order("position", { ascending: true })
		.order("created_at", { ascending: false });

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// POST / — Create database
databases.post("/", requireRole("owner", "admin"), async (c) => {
	const parsed = await parseBody(c, createDatabaseSchema);
	if ("error" in parsed) return parsed.error;

	// Get next position
	const { data: existing } = await supabase
		.from("databases")
		.select("position")
		.order("position", { ascending: false })
		.limit(1);

	const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

	const { data, error } = await supabase
		.from("databases")
		.insert({ ...parsed.data, position: nextPosition })
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data, 201);
});

// GET /:id — Get database by id
databases.get("/:id", async (c) => {
	const id = c.req.param("id");
	const { data, error } = await supabase.from("databases").select("*").eq("id", id).single();

	if (error) return c.json({ error: error.message }, 404);
	return c.json(data);
});

// PATCH /:id — Update database
databases.patch("/:id", requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, updateDatabaseSchema);
	if ("error" in parsed) return parsed.error;

	const { data, error } = await supabase
		.from("databases")
		.update(parsed.data)
		.eq("id", id)
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// DELETE /:id — Delete database
databases.delete("/:id", requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	const { error } = await supabase.from("databases").delete().eq("id", id);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});

// PUT /reorder — Reorder databases
databases.put("/reorder", requireRole("owner", "admin"), async (c) => {
	const parsed = await parseBody(c, reorderDatabasesSchema);
	if ("error" in parsed) return parsed.error;

	const { databaseIds } = parsed.data as { databaseIds: string[] };

	const updates = databaseIds.map((id, index) =>
		supabase.from("databases").update({ position: index }).eq("id", id),
	);

	const results = await Promise.all(updates);
	const failed = results.find((r) => r.error);

	if (failed?.error) return c.json({ error: failed.error.message }, 500);
	return c.json({ ok: true });
});
