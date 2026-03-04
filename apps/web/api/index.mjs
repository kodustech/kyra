import { app } from "./_app.mjs";

export const config = { runtime: "edge" };

export default function handler(request) {
	const url = new URL(request.url);
	const newUrl = new URL(
		url.pathname.replace(/^\/api/, "") + url.search,
		url.origin,
	);
	return app.fetch(new Request(newUrl.toString(), request));
}
