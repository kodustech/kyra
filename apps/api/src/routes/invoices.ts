import { syncInvoicesSchema, updateInvoiceSchema } from "@kyra/shared";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { customers, invoices } from "../db/schema";
import { parseBody } from "../lib/validate";
import { stripe } from "../lib/stripe";

export const invoicesRoutes = new Hono<AppEnv>();

invoicesRoutes.use("/*", requireRole("owner", "admin"));

// GET / — List invoices (optional status / customerId filter)
invoicesRoutes.get("/", async (c) => {
	const status = c.req.query("status");
	const customerId = c.req.query("customerId");

	const conditions = [] as ReturnType<typeof eq>[];
	if (status && (status === "pending" || status === "issued" || status === "sent")) {
		conditions.push(eq(invoices.status, status));
	}
	if (customerId) {
		conditions.push(eq(invoices.customerId, customerId));
	}

	const query = db
		.select({
			id: invoices.id,
			customerId: invoices.customerId,
			stripeInvoiceId: invoices.stripeInvoiceId,
			status: invoices.status,
			amount: invoices.amount,
			invoiceDate: invoices.invoiceDate,
			description: invoices.description,
			createdAt: invoices.createdAt,
			updatedAt: invoices.updatedAt,
			customerName: customers.companyName,
		})
		.from(invoices)
		.leftJoin(customers, eq(invoices.customerId, customers.id))
		.orderBy(desc(invoices.invoiceDate));

	const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

	return c.json(rows);
});

// PATCH /:id — Update invoice (status / description)
invoicesRoutes.patch("/:id", async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, updateInvoiceSchema);
	if ("error" in parsed) return parsed.error;

	const [existing] = await db.select().from(invoices).where(eq(invoices.id, id));
	if (!existing) return c.json({ error: "Invoice not found" }, 404);

	const [updated] = await db
		.update(invoices)
		.set({ ...parsed.data, updatedAt: new Date() })
		.where(eq(invoices.id, id))
		.returning();

	return c.json(updated);
});

// POST /sync — Sync invoices from Stripe for a date range
invoicesRoutes.post("/sync", async (c) => {
	const parsed = await parseBody(c, syncInvoicesSchema);
	if ("error" in parsed) return parsed.error;

	const startTimestamp = Math.floor(new Date(parsed.data.startDate).getTime() / 1000);
	const endTimestamp = Math.floor(new Date(parsed.data.endDate).getTime() / 1000);

	const stripeCustomers = await db
		.select()
		.from(customers)
		.where(isNotNull(customers.stripeCustomerId));

	const customerMap = new Map(
		stripeCustomers
			.filter((customer) => customer.stripeCustomerId)
			.map((customer) => [customer.stripeCustomerId as string, customer]),
	);

	let synced = 0;
	let hasMore = true;
	let startingAfter: string | undefined;

	while (hasMore) {
		const params: Record<string, unknown> = {
			created: { gte: startTimestamp, lte: endTimestamp },
			limit: 100,
		};
		if (startingAfter) params.starting_after = startingAfter;

		const stripeInvoices = await stripe.invoices.list(params as never);

		for (const inv of stripeInvoices.data) {
			const customer = inv.customer ? customerMap.get(inv.customer as string) : null;
			if (!customer) continue;

			const [existing] = await db
				.select()
				.from(invoices)
				.where(eq(invoices.stripeInvoiceId, inv.id));
			if (existing) continue;

			const amountValue = (inv.amount_paid / 100).toFixed(2);

			await db.insert(invoices).values({
				customerId: customer.id,
				stripeInvoiceId: inv.id,
				status: "pending",
				amount: amountValue,
				invoiceDate: inv.created ? new Date(inv.created * 1000) : null,
			});
			synced++;
		}

		hasMore = stripeInvoices.has_more;
		if (stripeInvoices.data.length > 0) {
			startingAfter = stripeInvoices.data[stripeInvoices.data.length - 1].id;
		}
	}

	return c.json({ synced });
});
