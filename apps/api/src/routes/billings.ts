import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { billings, customers } from "../db/schema";
import { stripe } from "../lib/stripe";

export const billingsRoutes = new Hono<AppEnv>();

billingsRoutes.use("/*", requireRole("owner", "admin"));

// GET / — List billings (optional customerId filter)
billingsRoutes.get("/", async (c) => {
	const customerId = c.req.query("customerId");

	const query = db
		.select({
			id: billings.id,
			customerId: billings.customerId,
			stripeInvoiceId: billings.stripeInvoiceId,
			paymentDate: billings.paymentDate,
			amountBrl: billings.amountBrl,
			amountUsd: billings.amountUsd,
			exchangeRate: billings.exchangeRate,
			createdAt: billings.createdAt,
			updatedAt: billings.updatedAt,
			customerName: customers.companyName,
		})
		.from(billings)
		.leftJoin(customers, eq(billings.customerId, customers.id))
		.orderBy(desc(billings.paymentDate));

	const rows = customerId
		? await query.where(eq(billings.customerId, customerId))
		: await query;

	return c.json(rows);
});

// GET /current — Current month billing per customer
billingsRoutes.get("/current", async (c) => {
	const result = await db
		.select({
			customerId: billings.customerId,
			customerName: customers.companyName,
			totalBrl: sql<string>`COALESCE(SUM(${billings.amountBrl}), 0)`,
			totalUsd: sql<string>`COALESCE(SUM(${billings.amountUsd}), 0)`,
		})
		.from(billings)
		.leftJoin(customers, eq(billings.customerId, customers.id))
		.where(sql`DATE_TRUNC('month', ${billings.paymentDate}) = DATE_TRUNC('month', CURRENT_DATE)`)
		.groupBy(billings.customerId, customers.companyName);

	return c.json(result);
});

// POST /sync — Sync paid Stripe invoices into billings
billingsRoutes.post("/sync", async (c) => {
	const stripeCustomers = await db
		.select()
		.from(customers)
		.where(isNotNull(customers.stripeCustomerId));

	let synced = 0;

	for (const customer of stripeCustomers) {
		if (!customer.stripeCustomerId) continue;

		const paid = await stripe.invoices.list({
			customer: customer.stripeCustomerId,
			status: "paid",
			limit: 100,
		});

		for (const inv of paid.data) {
			const [existing] = await db
				.select()
				.from(billings)
				.where(eq(billings.stripeInvoiceId, inv.id));
			if (existing) continue;

			const isUsd = inv.currency === "usd";
			const amountValue = (inv.amount_paid / 100).toFixed(2);

			await db.insert(billings).values({
				customerId: customer.id,
				stripeInvoiceId: inv.id,
				paymentDate: inv.created ? new Date(inv.created * 1000) : null,
				amountBrl: isUsd ? null : amountValue,
				amountUsd: isUsd ? amountValue : null,
			});
			synced++;
		}
	}

	return c.json({ synced });
});
