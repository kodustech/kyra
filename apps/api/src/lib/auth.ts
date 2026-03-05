import type { AuthUser, UserRole } from "@kyra/shared";
import bcrypt from "bcryptjs";
import { eq, and, isNull } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "kyra-dev-secret";
const JWT_EXPIRES_IN = "7d";

// Hono env type for typed context variables
export type AppEnv = {
	Variables: {
		user: AuthUser;
	};
};

interface JwtPayload {
	sub: string;
	email: string;
	role: UserRole;
}

// ─── Password helpers ───────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// ─── JWT helpers ────────────────────────────────────────────────────────────────

export function signToken(user: { id: string; email: string; role: UserRole }): string {
	return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
		expiresIn: JWT_EXPIRES_IN,
	});
}

export function verifyToken(token: string): JwtPayload {
	return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// ─── Auth middleware ────────────────────────────────────────────────────────────

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	const header = c.req.header("Authorization");
	if (!header?.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = header.slice(7);
	let payload: JwtPayload;
	try {
		payload = verifyToken(token);
	} catch {
		return c.json({ error: "Invalid or expired token" }, 401);
	}

	const [user] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			color: users.color,
		})
		.from(users)
		.where(and(eq(users.id, payload.sub), isNull(users.deletedAt)));

	if (!user) {
		return c.json({ error: "User not found" }, 401);
	}

	c.set("user", user as AuthUser);
	await next();
};

// ─── Role guard ─────────────────────────────────────────────────────────────────

export function requireRole(...roles: UserRole[]): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		if (!roles.includes(user.role)) {
			return c.json({ error: "Forbidden" }, 403);
		}
		await next();
	};
}
