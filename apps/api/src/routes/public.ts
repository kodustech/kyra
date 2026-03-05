import { buildRecordValidator } from "@kyra/shared";
import type { Field } from "@kyra/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import {
	blocks as blocksTable,
	databases as databasesTable,
	fields as fieldsTable,
	pages as pagesTable,
	records as recordsTable,
} from "../db/schema";

export const publicRoutes = new Hono();

// GET /:slug — Get public page with blocks, fields, and records
publicRoutes.get("/:slug", async (c) => {
	const slug = c.req.param("slug");

	// Get the page
	const [page] = await db
		.select()
		.from(pagesTable)
		.where(and(eq(pagesTable.slug, slug), eq(pagesTable.published, true)));

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Get blocks with their databases
	const blockRows = await db
		.select({
			block: blocksTable,
			database: databasesTable,
		})
		.from(blocksTable)
		.leftJoin(databasesTable, eq(blocksTable.databaseId, databasesTable.id))
		.where(eq(blocksTable.pageId, page.id))
		.orderBy(asc(blocksTable.position));

	// For each block, get fields and records (skip for richtext blocks)
	const blocksWithData = await Promise.all(
		blockRows.map(async (row) => {
			const block = { ...row.block, database: row.database };

			if (block.viewType === "richtext") {
				return { ...block, fields: [], records: [] };
			}

			const [fieldsData, recordsData] = await Promise.all([
				db
					.select()
					.from(fieldsTable)
					.where(eq(fieldsTable.databaseId, block.databaseId!))
					.orderBy(asc(fieldsTable.position)),
				db
					.select()
					.from(recordsTable)
					.where(eq(recordsTable.databaseId, block.databaseId!))
					.orderBy(desc(recordsTable.createdAt)),
			]);

			return {
				...block,
				fields: fieldsData,
				records: recordsData,
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
	const [page] = await db
		.select({ id: pagesTable.id })
		.from(pagesTable)
		.where(and(eq(pagesTable.slug, slug), eq(pagesTable.published, true)));

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	const body = await c.req.json();
	if (!body.data || typeof body.data !== "object") {
		return c.json({ error: "Invalid data" }, 400);
	}

	// Get existing record
	const [record] = await db
		.select()
		.from(recordsTable)
		.where(eq(recordsTable.id, recordId));

	if (!record) {
		return c.json({ error: "Record not found" }, 404);
	}

	// Verify the record's database belongs to a block on this page
	const [block] = await db
		.select({ id: blocksTable.id })
		.from(blocksTable)
		.where(and(eq(blocksTable.pageId, page.id), eq(blocksTable.databaseId, record.databaseId)))
		.limit(1);

	if (!block) {
		return c.json({ error: "Record does not belong to this page" }, 403);
	}

	// Merge data
	const mergedData = { ...(record.data as Record<string, unknown>), ...body.data };

	const [updated] = await db
		.update(recordsTable)
		.set({ data: mergedData, updatedAt: new Date() })
		.where(eq(recordsTable.id, recordId))
		.returning();

	return c.json(updated);
});

// POST /:slug/submit/:blockId — Submit form on public page
publicRoutes.post("/:slug/submit/:blockId", async (c) => {
	const slug = c.req.param("slug");
	const blockId = c.req.param("blockId");

	// Verify page is published
	const [page] = await db
		.select({ id: pagesTable.id })
		.from(pagesTable)
		.where(and(eq(pagesTable.slug, slug), eq(pagesTable.published, true)));

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Get block and verify it belongs to this page
	const [block] = await db
		.select()
		.from(blocksTable)
		.where(and(eq(blocksTable.id, blockId), eq(blocksTable.pageId, page.id)));

	if (!block) {
		return c.json({ error: "Block not found" }, 404);
	}

	if (block.viewType === "richtext") {
		return c.json({ error: "Rich text blocks do not accept submissions" }, 400);
	}

	// Get fields for validation
	const fieldsData = await db
		.select()
		.from(fieldsTable)
		.where(eq(fieldsTable.databaseId, block.databaseId!))
		.orderBy(asc(fieldsTable.position));

	const body = await c.req.json();
	const validator = buildRecordValidator(fieldsData as Field[]);
	const result = validator.safeParse(body.data);

	if (!result.success) {
		return c.json({ error: "Validation failed", details: result.error.issues }, 400);
	}

	const [data] = await db
		.insert(recordsTable)
		.values({ databaseId: block.databaseId!, data: result.data as Record<string, unknown> })
		.returning();

	return c.json(data, 201);
});
