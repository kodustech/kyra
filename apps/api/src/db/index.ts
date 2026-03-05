import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("Missing DATABASE_URL environment variable");
}

const client = postgres(databaseUrl, {
	ssl: "prefer",
	prepare: false,
	idle_timeout: 20,
	max: 1,
});

export const db = drizzle(client, { schema });
