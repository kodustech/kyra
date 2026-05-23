import Stripe from "stripe";

const apiKey = process.env.STRIPE_API_KEY;

if (!apiKey) {
	console.warn("[stripe] STRIPE_API_KEY not set — invoice/billing sync will fail until configured");
}

export const stripe = new Stripe(apiKey ?? "");
