import { createCommentSchema } from "@kyra/shared";
import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "../lib/auth";
import { db } from "../db";
import { comments, notifications, records, fields as fieldsTable, users } from "../db/schema";

export const commentsRoutes = new Hono<AppEnv>();

// GET / — List comments for a record
commentsRoutes.get("/", async (c) => {
	const recordId = c.req.param("recordId");

	const data = await db
		.select({
			id: comments.id,
			recordId: comments.recordId,
			authorId: comments.authorId,
			content: comments.content,
			createdAt: comments.createdAt,
			updatedAt: comments.updatedAt,
			authorName: users.name,
			authorColor: users.color,
		})
		.from(comments)
		.innerJoin(users, eq(comments.authorId, users.id))
		.where(eq(comments.recordId, recordId))
		.orderBy(asc(comments.createdAt));

	const result = data.map((row) => ({
		id: row.id,
		recordId: row.recordId,
		authorId: row.authorId,
		content: row.content,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		author: { id: row.authorId, name: row.authorName, color: row.authorColor },
	}));

	return c.json(result);
});

// POST / — Create comment + notifications for @mentions
commentsRoutes.post("/", async (c) => {
	const recordId = c.req.param("recordId");
	const databaseId = c.req.param("databaseId");
	const user = c.get("user");

	const body = await c.req.json();
	const parsed = createCommentSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error.issues }, 400);
	}

	const [comment] = await db
		.insert(comments)
		.values({ recordId, authorId: user.id, content: parsed.data.content })
		.returning();

	// Parse @mentions: @[uuid]
	const mentionRegex = /@\[([0-9a-f-]{36})\]/g;
	const mentionedIds = new Set<string>();
	let match: RegExpExecArray | null;
	while ((match = mentionRegex.exec(parsed.data.content)) !== null) {
		if (match[1] !== user.id) {
			mentionedIds.add(match[1]);
		}
	}

	if (mentionedIds.size > 0) {
		// Get record title (first text field value)
		let recordTitle: string | null = null;
		try {
			const dbFields = await db
				.select()
				.from(fieldsTable)
				.where(eq(fieldsTable.databaseId, databaseId))
				.orderBy(asc(fieldsTable.position));

			const textField = dbFields.find((f) => f.type === "text");
			if (textField) {
				const [record] = await db
					.select()
					.from(records)
					.where(eq(records.id, recordId));
				if (record) {
					const data = record.data as Record<string, unknown>;
					recordTitle = (data[textField.id] as string) || null;
				}
			}
		} catch {
			// ignore — title is optional
		}

		const notifValues = [...mentionedIds].map((userId) => ({
			userId,
			type: "mention" as const,
			actorId: user.id,
			commentId: comment.id,
			recordId,
			databaseId,
			recordTitle,
		}));

		await db.insert(notifications).values(notifValues);
	}

	// Return comment with author info
	return c.json(
		{
			...comment,
			author: { id: user.id, name: user.name, color: user.color },
		},
		201,
	);
});

// DELETE /:commentId — Delete comment (author or admin/owner only)
commentsRoutes.delete("/:commentId", async (c) => {
	const commentId = c.req.param("commentId");
	const user = c.get("user");

	const [comment] = await db
		.select()
		.from(comments)
		.where(eq(comments.id, commentId));

	if (!comment) {
		return c.json({ error: "Comment not found" }, 404);
	}

	if (comment.authorId !== user.id && user.role !== "owner" && user.role !== "admin") {
		return c.json({ error: "Forbidden" }, 403);
	}

	await db.delete(comments).where(eq(comments.id, commentId));
	return c.json({ ok: true });
});
