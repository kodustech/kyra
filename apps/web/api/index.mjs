import { app } from "./_app.mjs";

export const config = { runtime: "nodejs" };

export default function handler(request) {
	const base = `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host") || "localhost"}`;
	const url = new URL(request.url, base);
	const newUrl = new URL(
		url.pathname.replace(/^\/api/, "") + url.search,
		base,
	);
	return app.fetch(new Request(newUrl.toString(), request));
}
