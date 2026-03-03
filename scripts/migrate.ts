import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("Missing DATABASE_URL in environment");
	process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: "require" });

const migrationsDir = join(import.meta.dir, "..", "supabase", "migrations");

async function ensureMigrationsTable() {
	await sql`
		CREATE TABLE IF NOT EXISTS _migrations (
			id serial PRIMARY KEY,
			name text NOT NULL UNIQUE,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`;
}

async function getAppliedMigrations(): Promise<Set<string>> {
	const rows = await sql<{ name: string }[]>`SELECT name FROM _migrations ORDER BY name`;
	return new Set(rows.map((r) => r.name));
}

async function run() {
	console.log("Running migrations...\n");

	await ensureMigrationsTable();
	const applied = await getAppliedMigrations();

	const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

	let count = 0;

	for (const file of files) {
		if (applied.has(file)) {
			console.log(`  skip  ${file} (already applied)`);
			continue;
		}

		const filePath = join(migrationsDir, file);
		const content = await readFile(filePath, "utf-8");

		console.log(`  run   ${file}`);

		await sql.unsafe(content);
		await sql`INSERT INTO _migrations (name) VALUES (${file})`;

		count++;
	}

	if (count === 0) {
		console.log("\nNo pending migrations.");
	} else {
		console.log(`\nApplied ${count} migration(s).`);
	}

	await sql.end();
}

run().catch((err) => {
	console.error("\nMigration failed:", err.message);
	sql.end().then(() => process.exit(1));
});
