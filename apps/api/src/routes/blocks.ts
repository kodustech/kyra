import { createBlockSchema, reorderBlocksSchema, updateBlockSchema } from "@kyra/shared";
import { asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { blocks as blocksTable, databases as databasesTable } from "../db/schema";
import { parseBody } from "../lib/validate";

export const blocks = new Hono<AppEnv>();

// Helper: select block with joined database
async function selectBlocksWithDatabase(condition: ReturnType<typeof eq>) {
	const rows = await db
		.select({
			block: blocksTable,
			database: databasesTable,
		})
		.from(blocksTable)
		.leftJoin(databasesTable, eq(blocksTable.databaseId, databasesTable.id))
		.where(condition)
		.orderBy(asc(blocksTable.position));

	return rows.map((r) => ({
		...r.block,
		database: r.database,
	}));
}

// GET / — List blocks for a page
blocks.get("/", async (c) => {
	const pageId = c.req.param("pageId");
	const data = await selectBlocksWithDatabase(eq(blocksTable.pageId, pageId));
	return c.json(data);
});

// POST / — Create block
blocks.post("/", requireRole("owner", "admin", "editor"), async (c) => {
	const pageId = c.req.param("pageId");
	const parsed = await parseBody(c, createBlockSchema);
	if ("error" in parsed) return parsed.error;

	const body = parsed.data;

	// Get next position
	const [last] = await db
		.select({ position: blocksTable.position })
		.from(blocksTable)
		.where(eq(blocksTable.pageId, pageId))
		.orderBy(desc(blocksTable.position))
		.limit(1);

	const nextPosition = last ? last.position + 1 : 0;

	let blockTitle: string | null = null;
	if (body.viewType !== "richtext") {
		const [dbRow] = await db
			.select({ name: databasesTable.name })
			.from(databasesTable)
			.where(eq(databasesTable.id, body.databaseId));
		blockTitle = dbRow?.name ?? null;
	}

	const insertPayload =
		body.viewType === "richtext"
			? {
					pageId,
					viewType: body.viewType as "richtext",
					content: body.content ?? "",
					position: nextPosition,
				}
			: {
					pageId,
					databaseId: body.databaseId,
					viewType: body.viewType as "form" | "table" | "kanban",
					title: blockTitle,
					position: nextPosition,
				};

	const [inserted] = await db.insert(blocksTable).values(insertPayload).returning();

	// Return with joined database
	const [data] = await selectBlocksWithDatabase(eq(blocksTable.id, inserted.id));
	return c.json(data, 201);
});

// PATCH /:blockId — Update block
blocks.patch("/:blockId", requireRole("owner", "admin", "editor"), async (c) => {
	const blockId = c.req.param("blockId");
	const parsed = await parseBody(c, updateBlockSchema);
	if ("error" in parsed) return parsed.error;

	await db.update(blocksTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(blocksTable.id, blockId));

	const [data] = await selectBlocksWithDatabase(eq(blocksTable.id, blockId));
	if (!data) return c.json({ error: "Block not found" }, 404);
	return c.json(data);
});

// DELETE /:blockId — Delete block
blocks.delete("/:blockId", requireRole("owner", "admin", "editor"), async (c) => {
	const blockId = c.req.param("blockId");
	await db.delete(blocksTable).where(eq(blocksTable.id, blockId));
	return c.json({ ok: true });
});

// PUT /reorder — Reorder blocks
blocks.put("/reorder", requireRole("owner", "admin", "editor"), async (c) => {
	const parsed = await parseBody(c, reorderBlocksSchema);
	if ("error" in parsed) return parsed.error;

	const { blockIds } = parsed.data;

	await Promise.all(
		blockIds.map((id, index) =>
			db.update(blocksTable).set({ position: index }).where(eq(blocksTable.id, id)),
		),
	);

	return c.json({ ok: true });
});
