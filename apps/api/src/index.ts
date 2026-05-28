import { app } from "./app";

const port = Number.parseInt(process.env.PORT ?? "3100", 10);

export default {
	port,
	hostname: "0.0.0.0",
	fetch: app.fetch,
};
