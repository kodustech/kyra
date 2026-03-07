import { eq } from "drizzle-orm";
import { db } from "../db";
import { webhooks } from "../db/schema";

export type WebhookEvent =
	| "record.created"
	| "record.updated"
	| "record.deleted"
	| "comment.created";

interface WebhookPayload {
	event: WebhookEvent;
	timestamp: string;
	data: Record<string, unknown>;
}

export function dispatchWebhooks(event: WebhookEvent, data: Record<string, unknown>) {
	const payload: WebhookPayload = {
		event,
		timestamp: new Date().toISOString(),
		data,
	};

	// Fire and forget — don't block the request
	db.select({ id: webhooks.id, url: webhooks.url })
		.from(webhooks)
		.where(eq(webhooks.active, true))
		.then((activeWebhooks) => {
			for (const webhook of activeWebhooks) {
				fetch(webhook.url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				}).catch(() => {
					// Silently ignore delivery failures
				});
			}
		})
		.catch(() => {
			// Silently ignore DB errors
		});
}
