import { app } from "./_app.mjs";

export const config = { runtime: "nodejs" };

export default function handler(request) {
	const url = new URL(request.url, "http://localhost");
	const path = url.pathname.replace(/^\/api/, "") + url.search;
	return app.fetch(new Request(new URL(path, "http://localhost").toString(), request));
}
