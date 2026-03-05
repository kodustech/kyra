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
import { Hono } from "hono";
import { type AppEnv, authMiddleware, comparePassword, hashPassword, requireRole, signToken } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { parseBody } from "../lib/validate";

export const auth = new Hono<AppEnv>();

// ─── Setup ──────────────────────────────────────────────────────────────────────

// GET /setup/status — Check if setup is needed
auth.get("/setup/status", async (c) => {
	const { count } = await supabase.from("users").select("id", { count: "exact", head: true }).is("deleted_at", null);
	return c.json({ needsSetup: (count ?? 0) === 0 });
});

// POST /setup — Create first user (owner)
auth.post("/setup", async (c) => {
	const { count } = await supabase.from("users").select("id", { count: "exact", head: true }).is("deleted_at", null);
	if ((count ?? 0) > 0) {
		return c.json({ error: "Setup already completed" }, 400);
	}

	const parsed = await parseBody(c, setupSchema);
	if ("error" in parsed) return parsed.error;

	const { name, email, password, color } = parsed.data;
	const password_hash = await hashPassword(password);

	const { data: user, error } = await supabase
		.from("users")
		.insert({ name, email, password_hash, role: "owner", color })
		.select("id, name, email, role, color")
		.single();

	if (error) return c.json({ error: error.message }, 500);

	const token = signToken(user);
	return c.json({ user, token }, 201);
});

// ─── Login ──────────────────────────────────────────────────────────────────────

auth.post("/login", async (c) => {
	const parsed = await parseBody(c, loginSchema);
	if ("error" in parsed) return parsed.error;

	const { email, password } = parsed.data;

	const { data: user, error } = await supabase
		.from("users")
		.select("id, name, email, role, color, password_hash")
		.eq("email", email)
		.is("deleted_at", null)
		.single();

	if (error || !user) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const valid = await comparePassword(password, user.password_hash);
	if (!valid) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const token = signToken(user);
	const { password_hash: _, ...safeUser } = user;
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

	const updates: Record<string, unknown> = {};
	if (parsed.data.name) updates.name = parsed.data.name;
	if (parsed.data.color) updates.color = parsed.data.color;
	if (parsed.data.password) updates.password_hash = await hashPassword(parsed.data.password);

	if (Object.keys(updates).length === 0) {
		return c.json(user);
	}

	const { data, error } = await supabase
		.from("users")
		.update(updates)
		.eq("id", user.id)
		.select("id, name, email, role, color")
		.single();

	if (error) return c.json({ error: error.message }, 500);
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
	const { data: existing } = await supabase
		.from("users")
		.select("id")
		.eq("email", email)
		.is("deleted_at", null)
		.single();

	if (existing) {
		return c.json({ error: "User with this email already exists" }, 409);
	}

	const token = crypto.randomUUID();
	const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

	const { data: invite, error } = await supabase
		.from("invites")
		.insert({ email, name, role, token, expires_at, invited_by: user.id })
		.select()
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(invite, 201);
});

auth.get("/invites", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const { data, error } = await supabase
		.from("invites")
		.select("*")
		.is("accepted_at", null)
		.order("created_at", { ascending: false });

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

auth.delete("/invites/:id", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const id = c.req.param("id");
	const { error } = await supabase.from("invites").delete().eq("id", id);

	if (error) return c.json({ error: error.message }, 500);
	return c.json({ ok: true });
});

// ─── Public invite endpoints ────────────────────────────────────────────────────

auth.get("/invite/:token", async (c) => {
	const token = c.req.param("token");
	const { data: invite, error } = await supabase
		.from("invites")
		.select("id, email, name, role, expires_at, accepted_at")
		.eq("token", token)
		.single();

	if (error || !invite) {
		return c.json({ error: "Invite not found" }, 404);
	}

	if (invite.accepted_at) {
		return c.json({ error: "Invite already accepted" }, 400);
	}

	if (new Date(invite.expires_at) < new Date()) {
		return c.json({ error: "Invite expired" }, 400);
	}

	return c.json(invite);
});

auth.post("/invite/:token/accept", async (c) => {
	const token = c.req.param("token");
	const parsed = await parseBody(c, acceptInviteSchema);
	if ("error" in parsed) return parsed.error;

	const { password, color } = parsed.data;

	const { data: invite, error: inviteErr } = await supabase
		.from("invites")
		.select("*")
		.eq("token", token)
		.single();

	if (inviteErr || !invite) {
		return c.json({ error: "Invite not found" }, 404);
	}

	if (invite.accepted_at) {
		return c.json({ error: "Invite already accepted" }, 400);
	}

	if (new Date(invite.expires_at) < new Date()) {
		return c.json({ error: "Invite expired" }, 400);
	}

	const password_hash = await hashPassword(password);

	const { data: user, error: userErr } = await supabase
		.from("users")
		.insert({
			name: invite.name,
			email: invite.email,
			password_hash,
			role: invite.role,
			color,
		})
		.select("id, name, email, role, color")
		.single();

	if (userErr) {
		if (userErr.code === "23505") {
			return c.json({ error: "User with this email already exists" }, 409);
		}
		return c.json({ error: userErr.message }, 500);
	}

	// Mark invite as accepted
	await supabase.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

	const jwtToken = signToken(user);
	return c.json({ user, token: jwtToken }, 201);
});

// ─── User Management ────────────────────────────────────────────────────────────

auth.get("/users", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const user = c.get("user");

	let query = supabase
		.from("users")
		.select("id, name, email, role, color, created_at")
		.is("deleted_at", null)
		.order("created_at", { ascending: true });

	// Admin can only see editors and viewers
	if (user.role === "admin") {
		query = query.in("role", ["editor", "viewer"]);
	}

	const { data, error } = await query;
	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

auth.patch("/users/:id", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const actorUser = c.get("user");
	const targetId = c.req.param("id");
	const parsed = await parseBody(c, updateUserSchema_auth);
	if ("error" in parsed) return parsed.error;

	// Get target user
	const { data: target, error: targetErr } = await supabase
		.from("users")
		.select("id, role")
		.eq("id", targetId)
		.is("deleted_at", null)
		.single();

	if (targetErr || !target) {
		return c.json({ error: "User not found" }, 404);
	}

	if (!canManageRole(actorUser.role, target.role as UserRole)) {
		return c.json({ error: "Cannot manage this user" }, 403);
	}

	if (parsed.data.role && !canManageRole(actorUser.role, parsed.data.role as UserRole)) {
		return c.json({ error: "Cannot assign this role" }, 403);
	}

	const { data, error } = await supabase
		.from("users")
		.update(parsed.data)
		.eq("id", targetId)
		.select("id, name, email, role, color, created_at")
		.single();

	if (error) return c.json({ error: error.message }, 500);
	return c.json(data);
});

auth.delete("/users/:id", authMiddleware, requireRole("owner", "admin"), async (c) => {
	const actorUser = c.get("user");
	const targetId = c.req.param("id");

	if (actorUser.id === targetId) {
		return c.json({ error: "Cannot delete yourself" }, 400);
	}

	const { data: target, error: targetErr } = await supabase
		.from("users")
		.select("id, role")
		.eq("id", targetId)
		.is("deleted_at", null)
		.single();

	if (targetErr || !target) {
		return c.json({ error: "User not found" }, 404);
	}

	if (!canManageRole(actorUser.role, target.role as UserRole)) {
		return c.json({ error: "Cannot delete this user" }, 403);
	}

	// Soft-delete
	const { error } = await supabase
		.from("users")
		.update({ deleted_at: new Date().toISOString() })
		.eq("id", targetId);

	if (error) return c.json({ error: error.message }, 500);
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

	const { data: target, error: targetErr } = await supabase
		.from("users")
		.select("id")
		.eq("id", newOwnerId)
		.is("deleted_at", null)
		.single();

	if (targetErr || !target) {
		return c.json({ error: "User not found" }, 404);
	}

	// Transfer: new user → owner, old owner → admin
	await supabase.from("users").update({ role: "owner" }).eq("id", newOwnerId);
	await supabase.from("users").update({ role: "admin" }).eq("id", owner.id);

	return c.json({ ok: true });
});
