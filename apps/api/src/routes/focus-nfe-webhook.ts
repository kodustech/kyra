import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { invoices } from "../db/schema";
import { focusNfe } from "../lib/focus-nfe";

export const focusNfeWebhook = new Hono();

/**
 * Public webhook endpoint called by Focus NFe when a NFS-e status changes.
 * Payload shape: { ref, status, numero, url, caminho_xml_nota_fiscal, mensagem_sefaz, ... }
 *
 * Idempotency: we look up the invoice by nfse_reference. If not found, ack 200 to avoid retries.
 */
focusNfeWebhook.post("/", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as {
		ref?: string;
		status?: string;
		numero?: string;
		url?: string;
		url_danfse?: string;
		caminho_xml_nota_fiscal?: string;
		mensagem_sefaz?: string;
	};

	const reference = body.ref;
	if (!reference) {
		return c.json({ ok: false, reason: "missing ref" }, 400);
	}

	const [invoice] = await db
		.select()
		.from(invoices)
		.where(eq(invoices.nfseReference, reference));
	if (!invoice) {
		// Unknown reference — ack so Focus doesn't keep retrying
		return c.json({ ok: true, reason: "unknown reference" });
	}

	const mapped = focusNfe.mapStatus(body.status);
	await db
		.update(invoices)
		.set({
			nfseStatus: mapped,
			nfseNumber: body.numero ?? invoice.nfseNumber,
			nfsePdfUrl: body.url_danfse ?? body.url ?? invoice.nfsePdfUrl,
			nfseXmlUrl: body.caminho_xml_nota_fiscal ?? invoice.nfseXmlUrl,
			nfseError: mapped === "error" ? body.mensagem_sefaz ?? null : null,
			nfseIssuedAt:
				mapped === "authorized" ? invoice.nfseIssuedAt ?? new Date() : invoice.nfseIssuedAt,
			updatedAt: new Date(),
		})
		.where(eq(invoices.id, invoice.id));

	return c.json({ ok: true });
});
