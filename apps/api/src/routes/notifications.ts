import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "../lib/auth";
import { db } from "../db";
import { notifications, users } from "../db/schema";

export const notificationsRoutes = new Hono<AppEnv>();

// GET / — List notifications for current user
notificationsRoutes.get("/", async (c) => {
	const user = c.get("user");
	const limit = Math.min(Number(c.req.query("limit") || "50"), 100);
	const offset = Number(c.req.query("offset") || "0");

	const data = await db
		.select({
			id: notifications.id,
			userId: notifications.userId,
			type: notifications.type,
			actorId: notifications.actorId,
			commentId: notifications.commentId,
			recordId: notifications.recordId,
			databaseId: notifications.databaseId,
			recordTitle: notifications.recordTitle,
			read: notifications.read,
			createdAt: notifications.createdAt,
			actorName: users.name,
			actorColor: users.color,
		})
		.from(notifications)
		.innerJoin(users, eq(notifications.actorId, users.id))
		.where(eq(notifications.userId, user.id))
		.orderBy(desc(notifications.createdAt))
		.limit(limit)
		.offset(offset);

	const result = data.map((row) => ({
		id: row.id,
		userId: row.userId,
		type: row.type,
		actorId: row.actorId,
		commentId: row.commentId,
		recordId: row.recordId,
		databaseId: row.databaseId,
		recordTitle: row.recordTitle,
		read: row.read,
		createdAt: row.createdAt,
		actor: { id: row.actorId, name: row.actorName, color: row.actorColor },
	}));

	return c.json(result);
});

// GET /unread-count — Lightweight count for polling
notificationsRoutes.get("/unread-count", async (c) => {
	const user = c.get("user");

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(notifications)
		.where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

	return c.json({ count });
});

// PATCH /mark-all-read — Mark all as read
notificationsRoutes.patch("/mark-all-read", async (c) => {
	const user = c.get("user");

	await db
		.update(notifications)
		.set({ read: true })
		.where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

	return c.json({ ok: true });
});

// PATCH /:id/read — Mark one as read
notificationsRoutes.patch("/:id/read", async (c) => {
	const id = c.req.param("id");
	const user = c.get("user");

	const [updated] = await db
		.update(notifications)
		.set({ read: true })
		.where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
		.returning();

	if (!updated) return c.json({ error: "Notification not found" }, 404);
	return c.json({ ok: true });
});
