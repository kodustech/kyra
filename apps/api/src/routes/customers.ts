import { createCustomerSchema, updateCustomerSchema } from "@kyra/shared";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { customerContacts, customers } from "../db/schema";
import { parseBody } from "../lib/validate";

export const customersRoutes = new Hono<AppEnv>();

customersRoutes.use("/*", requireRole("owner", "admin"));

// GET / — List all customers
customersRoutes.get("/", async (c) => {
	const data = await db.select().from(customers).orderBy(asc(customers.companyName));
	return c.json(data);
});

// GET /:id — Get customer with contacts
customersRoutes.get("/:id", async (c) => {
	const id = c.req.param("id");
	const [customer] = await db.select().from(customers).where(eq(customers.id, id));
	if (!customer) return c.json({ error: "Customer not found" }, 404);

	const contacts = await db
		.select()
		.from(customerContacts)
		.where(eq(customerContacts.customerId, id))
		.orderBy(asc(customerContacts.createdAt));

	return c.json({ ...customer, contacts });
});

// POST / — Create customer (with optional contacts)
customersRoutes.post("/", async (c) => {
	const parsed = await parseBody(c, createCustomerSchema);
	if ("error" in parsed) return parsed.error;

	const { contacts, ...customerData } = parsed.data;

	const [newCustomer] = await db.insert(customers).values(customerData).returning();

	if (contacts && contacts.length > 0) {
		await db
			.insert(customerContacts)
			.values(contacts.map((contact) => ({ ...contact, customerId: newCustomer.id })));
	}

	const allContacts = await db
		.select()
		.from(customerContacts)
		.where(eq(customerContacts.customerId, newCustomer.id))
		.orderBy(asc(customerContacts.createdAt));

	return c.json({ ...newCustomer, contacts: allContacts }, 201);
});

// PATCH /:id — Update customer (replaces contacts when provided)
customersRoutes.patch("/:id", async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, updateCustomerSchema);
	if ("error" in parsed) return parsed.error;

	const [existing] = await db.select().from(customers).where(eq(customers.id, id));
	if (!existing) return c.json({ error: "Customer not found" }, 404);

	const { contacts, ...customerData } = parsed.data;

	const [updated] = await db
		.update(customers)
		.set({ ...customerData, updatedAt: new Date() })
		.where(eq(customers.id, id))
		.returning();

	if (contacts !== undefined) {
		await db.delete(customerContacts).where(eq(customerContacts.customerId, id));
		if (contacts.length > 0) {
			await db
				.insert(customerContacts)
				.values(contacts.map((contact) => ({ ...contact, customerId: id })));
		}
	}

	const allContacts = await db
		.select()
		.from(customerContacts)
		.where(eq(customerContacts.customerId, id))
		.orderBy(asc(customerContacts.createdAt));

	return c.json({ ...updated, contacts: allContacts });
});

// DELETE /:id — Delete customer (cascade deletes contacts and invoices/billings)
customersRoutes.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const [existing] = await db.select().from(customers).where(eq(customers.id, id));
	if (!existing) return c.json({ error: "Customer not found" }, 404);

	await db.delete(customers).where(eq(customers.id, id));
	return c.json({ ok: true });
});
