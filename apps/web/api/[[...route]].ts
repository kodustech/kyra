import { app } from "../../api/src/app";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
	const url = new URL(req.url);
	url.pathname = url.pathname.replace(/^\/api/, "") || "/";
	return app.fetch(new Request(url, req));
}
