import { createContactSchema } from "@kyra/shared";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { customerContacts, customers } from "../db/schema";
import { parseBody } from "../lib/validate";

export const customerContactsRoutes = new Hono<AppEnv>();

customerContactsRoutes.use("/*", requireRole("owner", "admin"));

async function ensureCustomerExists(customerId: string) {
	const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
	return customer ?? null;
}

// GET /
customerContactsRoutes.get("/", async (c) => {
	const customerId = c.req.param("customerId") as string;
	if (!(await ensureCustomerExists(customerId))) {
		return c.json({ error: "Customer not found" }, 404);
	}

	const contacts = await db
		.select()
		.from(customerContacts)
		.where(eq(customerContacts.customerId, customerId))
		.orderBy(asc(customerContacts.createdAt));

	return c.json(contacts);
});

// POST /
customerContactsRoutes.post("/", async (c) => {
	const customerId = c.req.param("customerId") as string;
	if (!(await ensureCustomerExists(customerId))) {
		return c.json({ error: "Customer not found" }, 404);
	}

	const parsed = await parseBody(c, createContactSchema);
	if ("error" in parsed) return parsed.error;

	const [contact] = await db
		.insert(customerContacts)
		.values({ ...parsed.data, customerId })
		.returning();

	return c.json(contact, 201);
});

// PATCH /:id
customerContactsRoutes.patch("/:id", async (c) => {
	const customerId = c.req.param("customerId") as string;
	const id = c.req.param("id");

	if (!(await ensureCustomerExists(customerId))) {
		return c.json({ error: "Customer not found" }, 404);
	}

	const parsed = await parseBody(c, createContactSchema);
	if ("error" in parsed) return parsed.error;

	const [existing] = await db
		.select()
		.from(customerContacts)
		.where(and(eq(customerContacts.id, id), eq(customerContacts.customerId, customerId)));
	if (!existing) return c.json({ error: "Contact not found" }, 404);

	const [updated] = await db
		.update(customerContacts)
		.set({ ...parsed.data, updatedAt: new Date() })
		.where(eq(customerContacts.id, id))
		.returning();

	return c.json(updated);
});

// DELETE /:id
customerContactsRoutes.delete("/:id", async (c) => {
	const customerId = c.req.param("customerId") as string;
	const id = c.req.param("id");

	if (!(await ensureCustomerExists(customerId))) {
		return c.json({ error: "Customer not found" }, 404);
	}

	const [existing] = await db
		.select()
		.from(customerContacts)
		.where(and(eq(customerContacts.id, id), eq(customerContacts.customerId, customerId)));
	if (!existing) return c.json({ error: "Contact not found" }, 404);

	await db.delete(customerContacts).where(eq(customerContacts.id, id));
	return c.json({ ok: true });
});
