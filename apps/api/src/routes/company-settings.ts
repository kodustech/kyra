import { upsertCompanySettingsSchema } from "@kyra/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { companySettings } from "../db/schema";
import { parseBody } from "../lib/validate";

export const companySettingsRoutes = new Hono<AppEnv>();

companySettingsRoutes.use("/*", requireRole("owner", "admin"));

// GET / — Returns singleton row, or null if not configured yet
companySettingsRoutes.get("/", async (c) => {
	const [row] = await db.select().from(companySettings).limit(1);
	return c.json(row ?? null);
});

// PUT / — Upsert singleton
companySettingsRoutes.put("/", async (c) => {
	const parsed = await parseBody(c, upsertCompanySettingsSchema);
	if ("error" in parsed) return parsed.error;

	const values = {
		...parsed.data,
		issAliquot: parsed.data.issAliquot != null ? parsed.data.issAliquot.toFixed(2) : null,
	};

	const [existing] = await db.select().from(companySettings).limit(1);

	if (existing) {
		const [updated] = await db
			.update(companySettings)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(companySettings.id, existing.id))
			.returning();
		return c.json(updated);
	}

	const [created] = await db.insert(companySettings).values(values).returning();
	return c.json(created, 201);
});
