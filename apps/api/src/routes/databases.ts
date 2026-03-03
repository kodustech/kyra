import { createDatabaseSchema, updateDatabaseSchema } from "@kyra/shared";
import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import { parseBody } from "../lib/validate";

export const databases = new Hono();

// GET / — List all databases
databases.get("/", async (c) => {
	const { data, error } = await supabase
		.from("databases")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// POST / — Create database
databases.post("/", async (c) => {
	const parsed = await parseBody(c, createDatabaseSchema);
	if ("error" in parsed) return parsed.error;

	const { data, error } = await supabase.from("databases").insert(parsed.data).select().single();

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
databases.patch("/:id", async (c) => {
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
databases.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const { error } = await supabase.from("databases").delete().eq("id", id);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});
