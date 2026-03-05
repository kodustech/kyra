import { buildRecordValidator } from "@kyra/shared";
import type { Field } from "@kyra/shared";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { supabase } from "../lib/supabase";

export const records = new Hono<AppEnv>();

async function getFields(databaseId: string): Promise<Field[]> {
	const { data, error } = await supabase
		.from("fields")
		.select("*")
		.eq("database_id", databaseId)
		.order("position", { ascending: true });

	if (error) throw new Error(error.message);
	return data as Field[];
}

// GET / — List records (paginated)
records.get("/", async (c) => {
	const databaseId = c.req.param("databaseId");
	const page = Number(c.req.query("page") || "1");
	const limit = Math.min(Number(c.req.query("limit") || "50"), 100);
	const offset = (page - 1) * limit;

	const { data, error, count } = await supabase
		.from("records")
		.select("*", { count: "exact" })
		.eq("database_id", databaseId)
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ data, total: count, page, limit });
});

// POST / — Create record (with dynamic validation)
records.post("/", requireRole("owner", "admin", "editor"), async (c) => {
	const databaseId = c.req.param("databaseId") as string;

	let fields: Field[];
	try {
		fields = await getFields(databaseId);
	} catch (err) {
		return c.json({ error: (err as Error).message }, 500);
	}

	const body = await c.req.json();
	const validator = buildRecordValidator(fields);
	const result = validator.safeParse(body.data);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	const { data, error } = await supabase
		.from("records")
		.insert({ database_id: databaseId, data: result.data })
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data, 201);
});

// PATCH /:recordId — Update record
records.patch("/:recordId", requireRole("owner", "admin", "editor"), async (c) => {
	const recordId = c.req.param("recordId");
	const databaseId = c.req.param("databaseId") as string;

	let fields: Field[];
	try {
		fields = await getFields(databaseId);
	} catch (err) {
		return c.json({ error: (err as Error).message }, 500);
	}

	const body = await c.req.json();
	const validator = buildRecordValidator(fields);
	const result = validator.safeParse(body.data);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	const { data, error } = await supabase
		.from("records")
		.update({ data: result.data })
		.eq("id", recordId)
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

// DELETE /:recordId — Delete record
records.delete("/:recordId", requireRole("owner", "admin", "editor"), async (c) => {
	const recordId = c.req.param("recordId");
	const { error } = await supabase.from("records").delete().eq("id", recordId);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});
