import {
	acceptInviteSchema,
	canManageRole,
	createInviteSchema,
	loginSchema,
	setupSchema,
	transferOwnershipSchema,
	updateProfileSchema,
	updateUserSchema_auth,
	type UserRole,
} from "@kyra/shared";
import crypto from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, authMiddleware, comparePassword, hashPassword, requireRole, signToken } from "../lib/auth";
import { db } from "../db";
import { users, invites } from "../db/schema";
import { parseBody } from "../lib/validate";

export const auth = new Hono<AppEnv>();

// ─── Setup ──────────────────────────────────────────────────────────────────────

// GET /setup/status — Check if setup is needed
auth.get("/setup/status", async (c) => {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(users)
		.where(isNull(users.deletedAt));

	return c.json({ needsSetup: (row?.count ?? 0) === 0 });
});

// POST /setup — Create first user (owner)
auth.post("/setup", async (c) => {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(users)
		.where(isNull(users.deletedAt));

	if ((row?.count ?? 0) > 0) {
		return c.json({ error: "Setup already completed" }, 400);
	}

	const parsed = await parseBody(c, setupSchema);
	if ("error" in parsed) return parsed.error;

	const { name, email, password, color } = parsed.data;
	const passwordHash = await hashPassword(password);

	const [user] = await db
		.insert(users)
		.values({ name, email, passwordHash, role: "owner", color })
		.returning({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			color: users.color,
		});

	const token = signToken(user);
	return c.json({ user, token }, 201);
});

// ─── Register (self-registration, pending approval) ────────────────────────────

auth.post("/register", async (c) => {
	const parsed = await parseBody(c, setupSchema);
	if ("error" in parsed) return parsed.error;

	const { name, email, password, color } = parsed.data;

	// Check if email already in use
	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.email, email), isNull(users.deletedAt)));

	if (existing) {
		return c.json({ error: "A user with this email already exists" }, 409);
	}

	const passwordHash = await hashPassword(password);

	const [user] = await db
		.insert(users)
		.values({ name, email, passwordHash, role: "pending", color })
		.returning({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			color: users.color,
		});

	const token = signToken(user);
	return c.json({ user, token }, 201);
});

// ─── Login ──────────────────────────────────────────────────────────────────────

auth.post("/login", async (c) => {
	const parsed = await parseBody(c, loginSchema);
	if ("error" in parsed) return parsed.error;

	const { email, password } = parsed.data;

	const [user] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			color: users.color,
			passwordHash: users.passwordHash,
		})
		.from(users)
		.where(and(eq(users.email, email), isNull(users.deletedAt)));

	if (!user) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const valid = await comparePassword(password, user.passwordHash);
	if (!valid) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const token = signToken(user);
	const { passwordHash: _, ...safeUser } = user;
	return c.json({ user: safeUser, token });
});

// ─── Me ─────────────────────────────────────────────────────────────────────────

auth.get("/me", authMiddleware, async (c) => {
	const user = c.get("user");
	return c.json(user);
});

auth.patch("/me", authMiddleware, async (c) => {
	const user = c.get("user");
	const parsed = await parseBody(c, updateProfileSchema);
	if ("error" in parsed) return parsed.error;

	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (parsed.data.name) updates.name = parsed.data.name;
	if (parsed.data.color) updates.color = parsed.data.color;
	if (parsed.data.password) updates.passwordHash = await hashPassword(parsed.data.password);

	if (Object.keys(updates).length === 1) {
		// Only updatedAt, nothing to update
		return c.json(user);
	}

	const [data] = await db
		.update(users)
		.set(updates)
		.where(eq(users.id, user.id))
		.returning({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			color: users.color,
		});

	return c.json(data);
});

// ─── Invites ────────────────────────────────────────────────────────────────────

auth.post("/invites", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const user = c.get("user");
	const parsed = await parseBody(c, createInviteSchema);
	if ("error" in parsed) return parsed.error;

	const { name, email, role } = parsed.data;

	// Admin cannot invite admin
	if (user.role === "admin" && role === "admin") {
		return c.json({ error: "Admins can only invite editors and viewers" }, 403);
	}

	// Check if email already used
	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.email, email), isNull(users.deletedAt)));

	if (existing) {
		return c.json({ error: "User with this email already exists" }, 409);
	}

	const token = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	const [invite] = await db
		.insert(invites)
		.values({ email, name, role, token, expiresAt, invitedBy: user.id })
		.returning();

	return c.json(invite, 201);
});

auth.get("/invites", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const data = await db
		.select()
		.from(invites)
		.where(isNull(invites.acceptedAt))
		.orderBy(desc(invites.createdAt));

	return c.json(data);
});

auth.delete("/invites/:id", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	await db.delete(invites).where(eq(invites.id, id));
	return c.json({ ok: true });
});

// ─── Public invite endpoints ────────────────────────────────────────────────────

auth.get("/invite/:token", async (c) => {
	const token = c.req.param("token");
	const [invite] = await db
		.select({
			id: invites.id,
			email: invites.email,
			name: invites.name,
			role: invites.role,
			expiresAt: invites.expiresAt,
			acceptedAt: invites.acceptedAt,
		})
		.from(invites)
		.where(eq(invites.token, token));

	if (!invite) {
		return c.json({ error: "Invite not found" }, 404);
	}

	if (invite.acceptedAt) {
		return c.json({ error: "Invite already accepted" }, 400);
	}

	if (new Date(invite.expiresAt) < new Date()) {
		return c.json({ error: "Invite expired" }, 400);
	}

	return c.json(invite);
});

auth.post("/invite/:token/accept", async (c) => {
	const token = c.req.param("token");
	const parsed = await parseBody(c, acceptInviteSchema);
	if ("error" in parsed) return parsed.error;

	const { password, color } = parsed.data;

	const [invite] = await db
		.select()
		.from(invites)
		.where(eq(invites.token, token));

	if (!invite) {
		return c.json({ error: "Invite not found" }, 404);
	}

	if (invite.acceptedAt) {
		return c.json({ error: "Invite already accepted" }, 400);
	}

	if (new Date(invite.expiresAt) < new Date()) {
		return c.json({ error: "Invite expired" }, 400);
	}

	const passwordHash = await hashPassword(password);

	try {
		const [user] = await db
			.insert(users)
			.values({
				name: invite.name,
				email: invite.email,
				passwordHash,
				role: invite.role,
				color,
			})
			.returning({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role,
				color: users.color,
			});

		// Mark invite as accepted
		await db
			.update(invites)
			.set({ acceptedAt: new Date() })
			.where(eq(invites.id, invite.id));

		const jwtToken = signToken(user);
		return c.json({ user, token: jwtToken }, 201);
	} catch (err: any) {
		if (err.code === "23505") {
			return c.json({ error: "User with this email already exists" }, 409);
		}
		return c.json({ error: err.message }, 500);
	}
});

// ─── User List (lightweight, any authenticated user) ─────────────────────────

auth.get("/users/list", authMiddleware, async (c) => {
	const data = await db
		.select({
			id: users.id,
			name: users.name,
			color: users.color,
		})
		.from(users)
		.where(and(isNull(users.deletedAt), sql`${users.role} != 'pending'`))
		.orderBy(asc(users.createdAt));

	return c.json(data);
});

// ─── User Management ────────────────────────────────────────────────────────────

auth.get("/users", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const user = c.get("user");

	const conditions = [isNull(users.deletedAt)];

	// Admin can only see editors, viewers, and pending
	if (user.role === "admin") {
		conditions.push(inArray(users.role, ["editor", "viewer", "pending"]));
	}

	const data = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			color: users.color,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(and(...conditions))
		.orderBy(asc(users.createdAt));

	return c.json(data);
});

auth.patch("/users/:id", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const actorUser = c.get("user");
	const targetId = c.req.param("id");
	const parsed = await parseBody(c, updateUserSchema_auth);
	if ("error" in parsed) return parsed.error;

	// Get target user
	const [target] = await db
		.select({ id: users.id, role: users.role })
		.from(users)
		.where(and(eq(users.id, targetId), isNull(users.deletedAt)));

	if (!target) {
		return c.json({ error: "User not found" }, 404);
	}

	if (!canManageRole(actorUser.role, target.role as UserRole)) {
		return c.json({ error: "Cannot manage this user" }, 403);
	}

	if (parsed.data.role && !canManageRole(actorUser.role, parsed.data.role as UserRole)) {
		return c.json({ error: "Cannot assign this role" }, 403);
	}

	const [data] = await db
		.update(users)
		.set({ ...parsed.data, updatedAt: new Date() })
		.where(eq(users.id, targetId))
		.returning({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			color: users.color,
			createdAt: users.createdAt,
		});

	return c.json(data);
});

auth.delete("/users/:id", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const actorUser = c.get("user");
	const targetId = c.req.param("id");

	if (actorUser.id === targetId) {
		return c.json({ error: "Cannot delete yourself" }, 400);
	}

	const [target] = await db
		.select({ id: users.id, role: users.role })
		.from(users)
		.where(and(eq(users.id, targetId), isNull(users.deletedAt)));

	if (!target) {
		return c.json({ error: "User not found" }, 404);
	}

	if (!canManageRole(actorUser.role, target.role as UserRole)) {
		return c.json({ error: "Cannot delete this user" }, 403);
	}

	// Soft-delete
	await db
		.update(users)
		.set({ deletedAt: new Date() })
		.where(eq(users.id, targetId));

	return c.json({ ok: true });
});

// ─── Transfer Ownership ─────────────────────────────────────────────────────────

auth.post("/transfer-ownership", authMiddleware, requireRole("owner"), async (c) => {
	const owner = c.get("user");
	const parsed = await parseBody(c, transferOwnershipSchema);
	if ("error" in parsed) return parsed.error;

	const { newOwnerId } = parsed.data;

	if (owner.id === newOwnerId) {
		return c.json({ error: "You are already the owner" }, 400);
	}

	const [target] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.id, newOwnerId), isNull(users.deletedAt)));

	if (!target) {
		return c.json({ error: "User not found" }, 404);
	}

	// Transfer: new user → owner, old owner → admin
	await db.update(users).set({ role: "owner" }).where(eq(users.id, newOwnerId));
	await db.update(users).set({ role: "admin" }).where(eq(users.id, owner.id));

	return c.json({ ok: true });
});
