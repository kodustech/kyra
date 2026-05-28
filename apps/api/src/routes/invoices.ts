import { issueNfseSchema, syncInvoicesSchema, updateInvoiceSchema } from "@kyra/shared";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, requireRole } from "../lib/auth";
import { db } from "../db";
import { companySettings, customers, invoices } from "../db/schema";
import { focusNfe, FocusNfeError } from "../lib/focus-nfe";
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

// POST /:id/issue-nfse — Issue NFS-e via Focus NFe
invoicesRoutes.post("/:id/issue-nfse", async (c) => {
	const id = c.req.param("id");
	const parsed = await parseBody(c, issueNfseSchema);
	if ("error" in parsed) return parsed.error;

	const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
	if (!invoice) return c.json({ error: "Invoice not found" }, 404);

	if (invoice.nfseStatus === "processing" || invoice.nfseStatus === "authorized") {
		return c.json(
			{ error: "Invoice already has an NFS-e in progress or authorized" },
			409,
		);
	}

	const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId));
	if (!customer) return c.json({ error: "Customer not found" }, 404);

	const [settings] = await db.select().from(companySettings).limit(1);
	if (!settings || !settings.focusNfeToken) {
		return c.json(
			{ error: "Company settings not configured. Set Focus NFe token first." },
			400,
		);
	}
	if (!invoice.amount) {
		return c.json({ error: "Invoice has no amount set" }, 400);
	}

	const reference = invoice.nfseReference ?? `inv_${invoice.id}`;
	const discrimination =
		parsed.data.discrimination ||
		invoice.description ||
		settings.defaultDiscrimination ||
		`Serviços prestados — fatura ${invoice.id.slice(0, 8)}`;

	// Mark as processing + persist reference for idempotency
	await db
		.update(invoices)
		.set({
			nfseStatus: "processing",
			nfseReference: reference,
			nfseError: null,
			updatedAt: new Date(),
		})
		.where(eq(invoices.id, id));

	try {
		const response = await focusNfe.issue(
			{ token: settings.focusNfeToken, environment: settings.focusNfeEnvironment },
			{
				reference,
				prestadorCnpj: settings.cnpj,
				prestadorInscricaoMunicipal: settings.municipalRegistration,
				tomadorCnpjCpf: customer.cnpj,
				tomadorRazaoSocial: customer.companyName,
				tomadorEmail: customer.invoiceEmails?.[0] ?? null,
				tomadorEndereco: {
					logradouro: customer.address,
					numero: customer.number,
					bairro: customer.district,
					codigoMunicipio: settings.cityCode,
					uf: customer.state,
					cep: customer.zipCode,
				},
				servico: {
					aliquota: settings.issAliquot ? Number.parseFloat(settings.issAliquot) : 0,
					discriminacao: discrimination,
					itemListaServico: settings.serviceItemCode,
					codigoTributarioMunicipio: settings.municipalServiceCode,
					valorServicos: Number.parseFloat(invoice.amount),
				},
			},
		);

		const mapped = focusNfe.mapStatus(response.status);
		const [updated] = await db
			.update(invoices)
			.set({
				nfseStatus: mapped,
				nfseNumber: response.numero ?? null,
				nfsePdfUrl: response.url_danfse ?? null,
				nfseXmlUrl: response.caminho_xml_nota_fiscal ?? null,
				nfseIssuedAt: mapped === "authorized" ? new Date() : null,
				nfseError: mapped === "error" ? response.mensagem_sefaz ?? null : null,
				updatedAt: new Date(),
			})
			.where(eq(invoices.id, id))
			.returning();

		return c.json(updated);
	} catch (err) {
		const message =
			err instanceof FocusNfeError ? err.message : (err as Error).message || "Unknown error";
		await db
			.update(invoices)
			.set({
				nfseStatus: "error",
				nfseError: message,
				updatedAt: new Date(),
			})
			.where(eq(invoices.id, id));
		return c.json({ error: message }, 502);
	}
});

// POST /:id/cancel-nfse — Cancel an issued NFS-e
invoicesRoutes.post("/:id/cancel-nfse", async (c) => {
	const id = c.req.param("id");
	const body = (await c.req.json().catch(() => ({}))) as { justification?: string };
	const justification = body.justification?.trim();
	if (!justification || justification.length < 15) {
		return c.json(
			{ error: "Justification with at least 15 characters is required" },
			400,
		);
	}

	const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
	if (!invoice) return c.json({ error: "Invoice not found" }, 404);
	if (invoice.nfseStatus !== "authorized" || !invoice.nfseReference) {
		return c.json({ error: "Only authorized NFS-e can be cancelled" }, 400);
	}

	const [settings] = await db.select().from(companySettings).limit(1);
	if (!settings || !settings.focusNfeToken) {
		return c.json({ error: "Company settings not configured" }, 400);
	}

	try {
		await focusNfe.cancel(
			{ token: settings.focusNfeToken, environment: settings.focusNfeEnvironment },
			invoice.nfseReference,
			justification,
		);
		const [updated] = await db
			.update(invoices)
			.set({ nfseStatus: "cancelled", updatedAt: new Date() })
			.where(eq(invoices.id, id))
			.returning();
		return c.json(updated);
	} catch (err) {
		const message =
			err instanceof FocusNfeError ? err.message : (err as Error).message || "Unknown error";
		return c.json({ error: message }, 502);
	}
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
