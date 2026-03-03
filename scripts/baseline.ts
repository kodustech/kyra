import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error("Missing DATABASE_URL");
	process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: "require" });

const migrations = ["001_create_schema.sql", "002_create_pages_and_blocks.sql"];

await sql`
	CREATE TABLE IF NOT EXISTS _migrations (
		id serial PRIMARY KEY,
		name text NOT NULL UNIQUE,
		applied_at timestamptz NOT NULL DEFAULT now()
	)
`;

for (const name of migrations) {
	await sql`INSERT INTO _migrations (name) VALUES (${name}) ON CONFLICT DO NOTHING`;
	console.log(`  baseline  ${name}`);
}

const rows = await sql<{ name: string }[]>`SELECT name FROM _migrations ORDER BY name`;
console.log(`\nRegistered: ${rows.map((r) => r.name).join(", ")}`);

await sql.end();
